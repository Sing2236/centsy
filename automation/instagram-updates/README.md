# Instagram Repo Updates

This folder contains a dependency-free GitHub automation script that:

1. Reads the GitHub push event payload.
2. Builds a short public-facing summary from the pushed commits.
3. Generates a custom JPEG with OpenAI.
4. Uploads that JPEG to a public Supabase Storage bucket.
5. Publishes the image + caption to Instagram through Meta's Instagram API.

## Files

- `index.mjs`: main automation entrypoint
- `fixtures/push-event.sample.json`: local dry-run sample payload

## Trigger

The workflow is wired to pushes on `main` by default.

## Required GitHub Actions secrets

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_ACCOUNT_ID`

## Optional GitHub Actions variables

- `OPENAI_IMAGE_MODEL`
  Default: `gpt-image-1.5`
- `SUPABASE_STORAGE_BUCKET`
  Default: `repo-instagram-updates`
- `INSTAGRAM_API_VERSION`
  Default: `v23.0`
- `INSTAGRAM_ALLOWED_BRANCHES`
  Default: `main`
- `INSTAGRAM_SKIP_TOKEN`
  Default: `[skip-instagram]`
- `INSTAGRAM_CONTAINER_WAIT_MS`
  Default: `5000`
- `INSTAGRAM_PUBLISH_RETRY_WAIT_MS`
  Default: `15000`

## Instagram prerequisites

- The Instagram account must be a professional account that can publish through the Instagram API.
- Your Meta app needs content publishing access and a valid Instagram user access token.
- The image used for publishing must be public. This script handles that by storing the generated JPEG in a public Supabase bucket.

## Supabase notes

The script will try to create `SUPABASE_STORAGE_BUCKET` automatically as a public bucket if it does not exist yet.

## Skip a post

Include `[skip-instagram]` in a commit subject to suppress the Instagram post for that push.

## Local dry run

Run the script against the included fixture without touching any external APIs:

```powershell
$env:INSTAGRAM_DRY_RUN="1"
node automation/instagram-updates/index.mjs automation/instagram-updates/fixtures/push-event.sample.json
```
