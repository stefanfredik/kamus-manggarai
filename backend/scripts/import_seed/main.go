package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/kamus-manggarai/backend/config"
	"github.com/kamus-manggarai/backend/internal/infrastructure/database"
)

// seedRow mirrors one object in kamus_manggarai_seed.json. The dictionary is
// Indonesian-headed: kata_indonesia is the headword, terjemahan_manggarai is a
// comma-separated list of Manggarai equivalents.
type seedRow struct {
	KataIndonesia       string `json:"kata_indonesia"`
	NomorHomonim        *int   `json:"nomor_homonim"`
	TerjemahanManggarai string `json:"terjemahan_manggarai"`
	KataTurunan         []struct {
		Kata        string `json:"kata"`
		Terjemahan  string `json:"terjemahan"`
	} `json:"kata_turunan"`
	Sumber string `json:"sumber"`
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = slugRe.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

// idGroup is one merged Indonesian headword: rows sharing (lemma, homonym) are
// collapsed into a single word that accumulates all Manggarai equivalents and
// derived words.
type idGroup struct {
	id      uuid.UUID
	lemma   string
	slug    string
	homonym *int
	source  string
	mgr     []string // ordered Manggarai equivalents (post comma-split)
	derived []derivedPair
}

type derivedPair struct{ word, translation string }

func main() {
	path := flag.String("file", "../data/kamus_manggarai_seed.json", "path to seed JSON")
	flag.Parse()

	raw, err := os.ReadFile(*path)
	if err != nil {
		fail("read seed file: %v", err)
	}
	var rows []seedRow
	if err := json.Unmarshal(raw, &rows); err != nil {
		fail("parse seed json: %v", err)
	}
	fmt.Printf("parsed %d seed rows\n", len(rows))

	// --- In-memory transform (no DB yet) ---
	used := map[string]bool{} // globally-unique slug registry (both languages)
	allocSlug := func(base string) string {
		if base == "" {
			base = "kata"
		}
		c := base
		for i := 2; used[c]; i++ {
			c = fmt.Sprintf("%s-%d", base, i)
		}
		used[c] = true
		return c
	}

	groups := make([]*idGroup, 0, len(rows))
	groupKey := map[string]*idGroup{}

	for _, r := range rows {
		lemma := strings.TrimSpace(r.KataIndonesia)
		if lemma == "" {
			continue
		}
		key := strings.ToLower(lemma) + "#" + fmt.Sprintf("%v", r.NomorHomonim)
		g, ok := groupKey[key]
		if !ok {
			g = &idGroup{
				id:      uuid.New(),
				lemma:   lemma,
				slug:    allocSlug(slugify(lemma)),
				homonym: r.NomorHomonim,
				source:  strings.TrimSpace(r.Sumber),
			}
			groupKey[key] = g
			groups = append(groups, g)
		}
		if g.source == "" {
			g.source = strings.TrimSpace(r.Sumber)
		}
		// Split Manggarai equivalents on comma only; multi-word phrases stay whole.
		for _, part := range strings.Split(r.TerjemahanManggarai, ",") {
			if p := strings.TrimSpace(part); p != "" {
				g.mgr = append(g.mgr, p)
			}
		}
		for _, d := range r.KataTurunan {
			w, t := strings.TrimSpace(d.Kata), strings.TrimSpace(d.Terjemahan)
			if w != "" && t != "" {
				g.derived = append(g.derived, derivedPair{w, t})
			}
		}
	}
	fmt.Printf("merged into %d Indonesian headwords\n", len(groups))

	// Manggarai words are reused across headwords by case-insensitive lemma.
	mgrID := map[string]uuid.UUID{}
	type mgrWord struct {
		id    uuid.UUID
		lemma string
		slug  string
	}
	mgrWords := make([]mgrWord, 0, 90000)
	getMgr := func(lemma string) uuid.UUID {
		k := strings.ToLower(lemma)
		if id, ok := mgrID[k]; ok {
			return id
		}
		id := uuid.New()
		mgrID[k] = id
		mgrWords = append(mgrWords, mgrWord{id: id, lemma: lemma, slug: allocSlug(slugify(lemma))})
		return id
	}

	type pair struct{ idW, mgrW uuid.UUID }
	seenPair := map[pair]bool{}
	transRows := make([][]any, 0, 90000)   // id_word_id, mgr_word_id, source
	derivedRows := make([][]any, 0, 30000) // word_id, word, translation, sort_order

	for _, g := range groups {
		for _, term := range g.mgr {
			mid := getMgr(term)
			p := pair{g.id, mid}
			if seenPair[p] {
				continue // collapse duplicate equivalents within/across merged rows
			}
			seenPair[p] = true
			var src any
			if g.source != "" {
				src = g.source
			}
			transRows = append(transRows, []any{g.id, mid, src})
		}
		for i, d := range g.derived {
			derivedRows = append(derivedRows, []any{g.id, d.word, d.translation, i})
		}
	}

	// Assemble the words CopyFrom payload: Indonesian headwords then Manggarai.
	wordRows := make([][]any, 0, len(groups)+len(mgrWords))
	for _, g := range groups {
		var hom any
		if g.homonym != nil {
			hom = *g.homonym
		}
		wordRows = append(wordRows, []any{g.id, "id", g.lemma, g.slug, hom})
	}
	for _, m := range mgrWords {
		wordRows = append(wordRows, []any{m.id, "mgr", m.lemma, m.slug, nil})
	}

	fmt.Printf("prepared: %d words (%d id + %d mgr), %d translations, %d derived\n",
		len(wordRows), len(groups), len(mgrWords), len(transRows), len(derivedRows))

	// --- Load into Postgres in a single transaction ---
	cfg, err := config.Load()
	if err != nil {
		fail("load config: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	pool, err := database.NewPostgres(ctx, cfg.DB)
	if err != nil {
		fail("connect postgres (%s): %v", cfg.DB.RedactedDSN(), err)
	}
	defer pool.Close()

	tx, err := pool.Begin(ctx)
	if err != nil {
		fail("begin tx: %v", err)
	}
	defer tx.Rollback(ctx)

	// Clear existing dictionary data. DELETE (not TRUNCATE) so dependent tables
	// follow their FK actions: translations/derived/reports cascade, submissions
	// SET NULL — and submissions themselves are preserved.
	if _, err := tx.Exec(ctx, `DELETE FROM words`); err != nil {
		fail("clear words: %v", err)
	}

	if _, err := tx.CopyFrom(ctx, pgx.Identifier{"words"},
		[]string{"id", "language", "lemma", "slug", "homonym_number"},
		pgx.CopyFromRows(wordRows)); err != nil {
		fail("copy words: %v", err)
	}
	if _, err := tx.CopyFrom(ctx, pgx.Identifier{"translations"},
		[]string{"id_word_id", "mgr_word_id", "source"},
		pgx.CopyFromRows(transRows)); err != nil {
		fail("copy translations: %v", err)
	}
	if _, err := tx.CopyFrom(ctx, pgx.Identifier{"derived_words"},
		[]string{"word_id", "word", "translation", "sort_order"},
		pgx.CopyFromRows(derivedRows)); err != nil {
		fail("copy derived_words: %v", err)
	}

	if err := tx.Commit(ctx); err != nil {
		fail("commit: %v", err)
	}
	fmt.Println("import committed successfully")
}

func fail(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "import failed: "+format+"\n", args...)
	os.Exit(1)
}
