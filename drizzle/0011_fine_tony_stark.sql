CREATE TABLE "registration_verification_codes" (
	"email" varchar(320) PRIMARY KEY NOT NULL,
	"code_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"resend_available_at" timestamp NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "registration_verification_codes_email_normalized_check" CHECK ("registration_verification_codes"."email" = lower("registration_verification_codes"."email")),
	CONSTRAINT "registration_verification_codes_failed_attempts_check" CHECK ("registration_verification_codes"."failed_attempts" >= 0)
);
