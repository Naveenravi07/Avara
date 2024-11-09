CREATE TABLE IF NOT EXISTS "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(50) NOT NULL,
	"pwd" varchar(60) NOT NULL,
	"email" varchar(40) NOT NULL,
	"phone" varchar(12) NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
