DB_URL=sqlite://db/socnet.db?cache=shared&mode=rwc
name=socnet

migrateup:
	migrate -path db/migrations -database "$(DB_URL)" -verbose up

migrateup1:
	migrate -path db/migrations -database "$(DB_URL)" -verbose up 1

migratedown:
	migrate -path db/migrations -database "$(DB_URL)" -verbose down

migratedown1:
	migrate -path db/migrations -database "$(DB_URL)" -verbose down 1

new_migration:
	migrate create -ext sql -dir db/migrations -seq $(name)

.PHONY: migrateup migratedown migrateup1 migratedown1 new_migration

# 1. run new_migration to create new up.sql and down.sql files with autoincrementing filenames
# 2. edit the up.sql and down.sql files to define the migration
# 3. run `make migrateup` to apply the migrations -- but this doesn't work somehow

# somehow, this works:
# go to backend dir
# sqlite3 ./db/socnet.db < ./db/migrations/000002_socnet.up.sql