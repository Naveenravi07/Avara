CREATE TABLE IF NOT EXISTS "meet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator" varchar(40) NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	CONSTRAINT "meet_creator_unique" UNIQUE("creator")
);
