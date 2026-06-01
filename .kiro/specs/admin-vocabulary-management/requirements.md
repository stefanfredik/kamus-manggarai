# Requirements Document

## Introduction

Fitur ini memungkinkan Admin untuk mengedit dan menghapus data kosakata (kata/`Word`) yang sudah dibuat dan tervalidasi (berstatus `published`) di dalam Kamus Manggarai. Saat ini sistem hanya mendukung pembuatan kata baru (`CreateWord`) dan penghapusan tingkat repositori (`Delete`), tetapi belum ada alur yang dapat digunakan Admin untuk memperbarui kata tervalidasi maupun mengelola siklus hidupnya secara aman.

Fitur ini melengkapi alur tersebut dengan operasi pengelolaan kosakata khusus Admin: mengubah atribut kata (lemma, kelas kata), mengelola terjemahan dan kata turunan, mengarsipkan atau menghapus permanen kata, beserta efek samping yang menyertainya (regenerasi slug, invalidasi cache, dan keterkaitan data seperti laporan dan submission).

Cakupan fitur ini terbatas pada sisi backend (Go, Fiber v3, clean architecture) yang diekspos melalui grup rute Admin (`/api/v1/admin`) yang dijaga oleh `middleware.RequireAdmin()`.

## Glossary

- **Admin**: Pengguna terautentikasi yang memiliki peran `admin`, satu-satunya peran yang diizinkan menjalankan operasi pada fitur ini.
- **Word_Management_Service**: Komponen backend (lapisan use case) yang menangani logika pengelolaan kosakata oleh Admin, termasuk validasi, regenerasi slug, dan invalidasi cache.
- **Word_Repository**: Komponen backend (lapisan repository) yang menyimpan dan mengambil entitas `Word`, `TranslationLink`, dan `DerivedWord` dari basis data.
- **Cache_Store**: Penyimpanan Redis yang menyimpan hasil cache untuk detail kata (`word:detail:{slug}`), daftar kata (`word:list:*`), dan pencarian (`search:*`).
- **Kata**: Entitas `Word` yaitu satu lema dalam satu bahasa (`id` atau `mgr`), memiliki atribut lemma, slug, kelas kata (`part_of_speech`), dan status.
- **Kata_Tervalidasi**: Kata yang berstatus `published`, yaitu kata yang sudah dibuat dan tervalidasi (baik dibuat langsung oleh Admin/Validator maupun disetujui melalui alur review submission).
- **Kata_Terarsip**: Kata yang berstatus `archived`, yaitu kata yang disembunyikan dari kamus publik tetapi datanya tetap tersimpan.
- **Terjemahan**: Entitas `TranslationLink` yang menautkan sebuah Kata ke Kata pasangannya di bahasa lawan melalui tabel `translations`.
- **Kata_Turunan**: Entitas `DerivedWord` (kata turunan) yang melekat pada sebuah Kata, memiliki teks kata, terjemahan, dan urutan (`sort_order`).
- **Slug**: Pengenal unik berbasis teks (kolom `slug`, `UNIQUE`) yang digunakan pada URL detail kata.
- **Lemma**: Bentuk dasar kata (kolom `lemma`) yang ditampilkan sebagai judul entri kamus.

## Requirements

### Requirement 1: Otorisasi Pengelolaan Kosakata

**User Story:** Sebagai Admin, saya ingin operasi edit dan hapus kosakata hanya dapat diakses oleh Admin, sehingga integritas data kamus terjaga dari perubahan oleh pengguna yang tidak berwenang.

#### Acceptance Criteria

1. IF permintaan edit, arsip, atau hapus kosakata diterima tanpa token autentikasi yang valid, THEN THE Word_Management_Service SHALL menolak permintaan dengan kode kesalahan `UNAUTHORIZED` (HTTP 401).
2. IF pengguna terautentikasi tanpa peran Admin mengirim permintaan edit, arsip, atau hapus kosakata, THEN THE Word_Management_Service SHALL menolak permintaan dengan kode kesalahan `FORBIDDEN` (HTTP 403).
3. WHEN Admin mengirim permintaan pada endpoint pengelolaan kosakata, THE Word_Management_Service SHALL memproses operasi yang diminta.

### Requirement 2: Mengambil Kata untuk Dikelola

**User Story:** Sebagai Admin, saya ingin mengambil data lengkap sebuah kata berdasarkan pengenalnya, termasuk kata yang sudah diarsipkan, sehingga saya dapat meninjau data sebelum mengedit atau menghapusnya.

#### Acceptance Criteria

1. WHEN Admin meminta detail sebuah kata berdasarkan pengenal (`id`), THE Word_Management_Service SHALL mengembalikan detail kata beserta daftar Terjemahan dan Kata_Turunan-nya.
2. WHEN Admin meminta detail sebuah Kata_Terarsip, THE Word_Management_Service SHALL mengembalikan detail kata tersebut tanpa memperlakukannya sebagai tidak ditemukan.
3. IF Admin meminta detail kata dengan pengenal yang tidak ada di basis data, THEN THE Word_Management_Service SHALL mengembalikan kode kesalahan `NOT_FOUND` (HTTP 404).
4. IF Admin meminta detail kata dengan format pengenal yang tidak valid, THEN THE Word_Management_Service SHALL mengembalikan kode kesalahan `BAD_REQUEST` (HTTP 400).

### Requirement 3: Mengedit Atribut Dasar Kata

**User Story:** Sebagai Admin, saya ingin mengubah lemma dan kelas kata dari sebuah Kata_Tervalidasi, sehingga saya dapat memperbaiki kesalahan ejaan atau klasifikasi pada entri kamus yang sudah terbit.

#### Acceptance Criteria

1. WHEN Admin mengirim permintaan pembaruan sebuah kata dengan nilai lemma baru yang tidak kosong, THE Word_Management_Service SHALL menyimpan lemma baru pada kata tersebut.
2. WHEN Admin mengirim permintaan pembaruan sebuah kata dengan nilai kelas kata baru, THE Word_Management_Service SHALL menyimpan kelas kata baru pada kata tersebut.
3. WHEN Admin mengosongkan nilai kelas kata pada permintaan pembaruan, THE Word_Management_Service SHALL menyimpan kelas kata sebagai kosong (`null`) pada kata tersebut.
4. WHEN Word_Management_Service berhasil memperbarui sebuah kata, THE Word_Management_Service SHALL menetapkan nilai `updated_at` kata tersebut ke waktu saat pembaruan dilakukan.
5. IF Admin mengirim permintaan pembaruan dengan lemma kosong atau hanya berisi spasi, THEN THE Word_Management_Service SHALL menolak permintaan dengan kode kesalahan `VALIDATION_ERROR` (HTTP 422).
6. IF Admin mengirim permintaan pembaruan untuk kata dengan pengenal yang tidak ada, THEN THE Word_Management_Service SHALL mengembalikan kode kesalahan `NOT_FOUND` (HTTP 404).

### Requirement 4: Mengelola Terjemahan Kata

**User Story:** Sebagai Admin, saya ingin menambah, mengubah, dan menghapus terjemahan dari sebuah Kata_Tervalidasi, sehingga pasangan terjemahan antarbahasa tetap akurat.

#### Acceptance Criteria

1. WHEN Admin menambahkan sebuah terjemahan baru dengan lemma pasangan yang tidak kosong, THE Word_Management_Service SHALL membuat tautan Terjemahan dari kata tersebut ke kata pasangan di bahasa lawan.
2. WHERE lemma pasangan yang ditambahkan sudah ada sebagai kata di bahasa lawan, THE Word_Management_Service SHALL menggunakan kembali kata yang sudah ada tersebut alih-alih membuat kata baru.
3. WHEN Admin menghapus sebuah terjemahan dari kata, THE Word_Management_Service SHALL menghapus tautan Terjemahan tersebut tanpa menghapus kata pasangannya.
4. WHEN Admin mengubah catatan (`notes`) atau kelas kata pada sebuah terjemahan, THE Word_Management_Service SHALL menyimpan nilai baru pada tautan Terjemahan tersebut.
5. THE Word_Management_Service SHALL mempertahankan minimal satu Terjemahan pada setiap kata setelah operasi pembaruan selesai.
6. IF hasil pembaruan akan menyisakan kata tanpa Terjemahan sama sekali, THEN THE Word_Management_Service SHALL menolak permintaan dengan kode kesalahan `VALIDATION_ERROR` (HTTP 422).

### Requirement 5: Mengelola Kata Turunan

**User Story:** Sebagai Admin, saya ingin menambah, mengubah, menghapus, dan mengurutkan kata turunan dari sebuah Kata_Tervalidasi, sehingga daftar kata turunan pada entri kamus tetap relevan dan teratur.

#### Acceptance Criteria

1. WHEN Admin menambahkan sebuah Kata_Turunan dengan teks kata yang tidak kosong, THE Word_Management_Service SHALL menyimpan Kata_Turunan tersebut yang tertaut pada kata induk.
2. WHEN Admin mengubah teks kata atau terjemahan sebuah Kata_Turunan, THE Word_Management_Service SHALL menyimpan nilai baru pada Kata_Turunan tersebut.
3. WHEN Admin menghapus sebuah Kata_Turunan, THE Word_Management_Service SHALL menghapus Kata_Turunan tersebut dari kata induk.
4. WHEN Admin menentukan urutan Kata_Turunan pada permintaan pembaruan, THE Word_Management_Service SHALL menyimpan nilai `sort_order` sesuai urutan yang diberikan.
5. WHEN Word_Management_Service mengembalikan detail kata, THE Word_Management_Service SHALL mengurutkan daftar Kata_Turunan berdasarkan `sort_order` menaik.

### Requirement 6: Regenerasi dan Keunikan Slug

**User Story:** Sebagai Admin, saya ingin slug kata diperbarui secara otomatis dan tetap unik ketika lemma diubah, sehingga tautan detail kamus tetap konsisten dan tidak bertabrakan.

#### Acceptance Criteria

1. WHEN Admin memperbarui lemma sebuah kata sehingga berbeda dari lemma sebelumnya, THE Word_Management_Service SHALL menghasilkan ulang slug kata tersebut dari lemma yang baru.
2. WHERE slug hasil regenerasi sudah digunakan oleh kata lain, THE Word_Management_Service SHALL menambahkan akhiran angka pada slug sampai diperoleh slug yang unik.
3. WHEN Admin memperbarui kata tanpa mengubah lemma, THE Word_Management_Service SHALL mempertahankan slug kata tersebut tanpa perubahan.
4. IF Word_Management_Service tidak dapat memperoleh slug unik untuk lemma yang baru, THEN THE Word_Management_Service SHALL mengembalikan kode kesalahan `CONFLICT` (HTTP 409).

### Requirement 7: Mengarsipkan dan Memulihkan Kata

**User Story:** Sebagai Admin, saya ingin mengarsipkan sebuah Kata_Tervalidasi (penghapusan lunak) dan memulihkannya kembali, sehingga kata dapat disembunyikan dari kamus publik tanpa kehilangan datanya dan dapat dikembalikan bila diperlukan.

#### Acceptance Criteria

1. WHEN Admin mengarsipkan sebuah Kata_Tervalidasi, THE Word_Management_Service SHALL mengubah status kata tersebut menjadi `archived`.
2. WHILE sebuah kata berstatus `archived`, THE Word_Management_Service SHALL mengecualikan kata tersebut dari hasil daftar kamus publik dan hasil pencarian publik.
3. WHEN Admin memulihkan sebuah Kata_Terarsip, THE Word_Management_Service SHALL mengubah status kata tersebut menjadi `published`.
4. WHEN Word_Management_Service mengarsipkan sebuah kata, THE Word_Management_Service SHALL mempertahankan seluruh Terjemahan dan Kata_Turunan yang tertaut pada kata tersebut.
5. IF Admin mengarsipkan kata dengan pengenal yang tidak ada, THEN THE Word_Management_Service SHALL mengembalikan kode kesalahan `NOT_FOUND` (HTTP 404).

### Requirement 8: Menghapus Permanen Kata

**User Story:** Sebagai Admin, saya ingin menghapus permanen sebuah kata beserta data terkaitnya, sehingga entri yang benar-benar tidak diinginkan dapat dihilangkan dari basis data.

#### Acceptance Criteria

1. WHEN Admin mengonfirmasi penghapusan permanen sebuah kata, THE Word_Management_Service SHALL menghapus kata tersebut dari basis data.
2. WHEN Word_Management_Service menghapus permanen sebuah kata, THE Word_Management_Service SHALL menghapus seluruh tautan Terjemahan dan Kata_Turunan yang melekat pada kata tersebut.
3. WHEN Word_Management_Service menghapus permanen sebuah kata yang tertaut pada satu atau lebih submission, THE Word_Management_Service SHALL mengosongkan tautan kata pada submission tersebut (`resulting_entry_id` menjadi `null`) tanpa menghapus submission.
4. IF Admin mengirim permintaan penghapusan permanen tanpa penanda konfirmasi eksplisit, THEN THE Word_Management_Service SHALL menolak permintaan dengan kode kesalahan `BAD_REQUEST` (HTTP 400).
5. IF Admin menghapus permanen kata dengan pengenal yang tidak ada, THEN THE Word_Management_Service SHALL mengembalikan kode kesalahan `NOT_FOUND` (HTTP 404).

### Requirement 9: Invalidasi Cache

**User Story:** Sebagai Admin, saya ingin perubahan dan penghapusan kosakata langsung tercermin pada kamus publik, sehingga pengguna tidak melihat data lama yang masih tersimpan di cache.

#### Acceptance Criteria

1. WHEN Word_Management_Service berhasil memperbarui sebuah kata, THE Word_Management_Service SHALL menghapus entri cache detail kata untuk slug lama dan slug baru kata tersebut dari Cache_Store.
2. WHEN Word_Management_Service berhasil memperbarui, mengarsipkan, memulihkan, atau menghapus permanen sebuah kata, THE Word_Management_Service SHALL menghapus entri cache daftar kata (`word:list:*`) dan cache pencarian (`search:*`) dari Cache_Store.
3. IF penghapusan entri cache gagal, THEN THE Word_Management_Service SHALL tetap menyelesaikan operasi pengelolaan kosakata sebagai berhasil.

### Requirement 10: Validasi Masukan

**User Story:** Sebagai Admin, saya ingin sistem memvalidasi data yang saya kirim, sehingga kesalahan masukan terdeteksi sejak awal dengan pesan yang jelas.

#### Acceptance Criteria

1. WHEN Word_Management_Service menerima permintaan pembaruan kata, THE Word_Management_Service SHALL memangkas spasi di awal dan akhir pada nilai lemma sebelum disimpan.
2. IF Admin mengirim nilai kelas kata yang melebihi 50 karakter, THEN THE Word_Management_Service SHALL menolak permintaan dengan kode kesalahan `VALIDATION_ERROR` (HTTP 422).
3. IF Admin mengirim lemma terjemahan yang kosong atau hanya berisi spasi pada sebuah terjemahan, THEN THE Word_Management_Service SHALL mengabaikan terjemahan kosong tersebut dari pemrosesan.
4. WHEN Admin mengirim badan permintaan dengan format yang tidak dapat diuraikan, THE Word_Management_Service SHALL mengembalikan kode kesalahan `BAD_REQUEST` (HTTP 400).

### Requirement 11: Penanganan Kesalahan Operasi

**User Story:** Sebagai Admin, saya ingin operasi pengelolaan kosakata bersifat atomik dan mengembalikan kesalahan yang konsisten, sehingga data kamus tidak berada dalam kondisi sebagian terubah ketika terjadi kegagalan.

#### Acceptance Criteria

1. IF terjadi kegagalan saat menyimpan sebagian dari pembaruan kata, terjemahan, atau kata turunan, THEN THE Word_Management_Service SHALL membatalkan seluruh perubahan pada operasi tersebut sehingga data kembali ke kondisi sebelum operasi.
2. IF terjadi kesalahan tak terduga selama operasi pengelolaan kosakata, THEN THE Word_Management_Service SHALL mengembalikan kode kesalahan `INTERNAL_ERROR` (HTTP 500).
3. WHEN Word_Management_Service mengembalikan kesalahan, THE Word_Management_Service SHALL menyertakan kode kesalahan dan pesan yang dapat dipahami pengguna.
