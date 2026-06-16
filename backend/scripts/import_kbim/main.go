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

// kbimRow mirrors one object in kamus_indonesia_manggarai.json. The dictionary
// is Indonesian-headed: headword is the Indonesian lemma, manggarai_text is a
// comma/semicolon-separated list of Manggarai equivalents.
type kbimRow struct {
	ID            int    `json:"id"`
	Headword      string `json:"headword"`
	ManggaraiText string `json:"manggarai_text"`
}

var (
	slugRe   = regexp.MustCompile(`[^a-z0-9]+`)
	splitRe  = regexp.MustCompile(`[;,]`)        // comma + semicolon both separate equivalents
	letterRe = regexp.MustCompile(`[A-Za-zÀ-ÿ]`) // a valid headword must contain a letter
)

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = slugRe.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

// idGroup is one merged Indonesian headword: rows sharing a lowercased lemma are
// collapsed into a single word that accumulates all Manggarai equivalents.
type idGroup struct {
	id    uuid.UUID
	lemma string
	slug  string
	mgr   []string // ordered, de-duplicated Manggarai equivalents
}

func main() {
	path := flag.String("file", "../data/kamus_indonesia_manggarai.json", "path to dictionary JSON")
	flag.Parse()

	raw, err := os.ReadFile(*path)
	if err != nil {
		fail("read file: %v", err)
	}
	var rows []kbimRow
	if err := json.Unmarshal(raw, &rows); err != nil {
		fail("parse json: %v", err)
	}
	fmt.Printf("parsed %d rows\n", len(rows))

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
	byKey := map[string]*idGroup{}
	skipped := 0

	for _, r := range rows {
		hw := strings.TrimSpace(r.Headword)
		// Skip OCR artifacts: headwords with no letter (e.g. ",", "2").
		if hw == "" || !letterRe.MatchString(hw) {
			skipped++
			continue
		}
		key := strings.ToLower(hw)
		g, ok := byKey[key]
		if !ok {
			g = &idGroup{id: uuid.New(), lemma: hw, slug: allocSlug(slugify(hw))}
			byKey[key] = g
			groups = append(groups, g)
		}
		for _, part := range splitRe.Split(r.ManggaraiText, -1) {
			if p := strings.TrimSpace(part); p != "" {
				g.mgr = append(g.mgr, p)
			}
		}
	}
	fmt.Printf("skipped %d junk rows; merged into %d Indonesian headwords\n", skipped, len(groups))

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
	transRows := make([][]any, 0, 95000) // id_word_id, mgr_word_id

	for _, g := range groups {
		for _, term := range g.mgr {
			mid := getMgr(term)
			p := pair{g.id, mid}
			if seenPair[p] {
				continue // collapse duplicate equivalents within a headword
			}
			seenPair[p] = true
			transRows = append(transRows, []any{g.id, mid})
		}
	}

	// Assemble the words payload: Indonesian headwords then Manggarai words.
	wordRows := make([][]any, 0, len(groups)+len(mgrWords))
	for _, g := range groups {
		wordRows = append(wordRows, []any{g.id, "id", g.lemma, g.slug})
	}
	for _, m := range mgrWords {
		wordRows = append(wordRows, []any{m.id, "mgr", m.lemma, m.slug})
	}

	fmt.Printf("prepared: %d words (%d id + %d mgr), %d translations\n",
		len(wordRows), len(groups), len(mgrWords), len(transRows))

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

	// Clear existing dictionary. DELETE (not TRUNCATE) so dependent tables follow
	// their FK actions: translations/derived/reports cascade, submissions SET NULL.
	if _, err := tx.Exec(ctx, `DELETE FROM words`); err != nil {
		fail("clear words: %v", err)
	}

	if _, err := tx.CopyFrom(ctx, pgx.Identifier{"words"},
		[]string{"id", "language", "lemma", "slug"},
		pgx.CopyFromRows(wordRows)); err != nil {
		fail("copy words: %v", err)
	}
	if _, err := tx.CopyFrom(ctx, pgx.Identifier{"translations"},
		[]string{"id_word_id", "mgr_word_id"},
		pgx.CopyFromRows(transRows)); err != nil {
		fail("copy translations: %v", err)
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
