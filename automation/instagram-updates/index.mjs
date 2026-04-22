import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const DEFAULT_ALLOWED_BRANCHES = ["main"];
const DEFAULT_BUCKET = "repo-instagram-updates";
const DEFAULT_IMAGE_MODEL = "gpt-image-1.5";
const DEFAULT_INSTAGRAM_API_VERSION = "v23.0";
const DEFAULT_SKIP_TOKEN = "[skip-instagram]";
const MAX_CAPTION_LENGTH = 2200;

const dryRun = isTruthy(process.env.INSTAGRAM_DRY_RUN);

async function main() {
  const event = loadEventPayload();
  const digest = buildUpdateDigest(event);

  const skipReason = getSkipReason(digest);
  if (skipReason) {
    console.log(`Skipping Instagram post: ${skipReason}`);
    return;
  }

  const caption = buildCaption(digest);
  const imagePrompt = buildImagePrompt(digest);

  console.log(`Prepared Instagram update for ${digest.repoFullName} on ${digest.branch}.`);
  console.log(`Summary: ${digest.summary}`);

  if (dryRun) {
    console.log("Dry run enabled. No external API calls were made.");
    console.log("");
    console.log("Caption:");
    console.log(caption);
    console.log("");
    console.log("Image prompt:");
    console.log(imagePrompt);
    return;
  }

  const openAiApiKey = requireEnv("OPENAI_API_KEY");
  const supabaseUrl = stripTrailingSlash(requireEnv("SUPABASE_URL"));
  const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const instagramAccessToken = requireEnv("INSTAGRAM_ACCESS_TOKEN");
  const instagramAccountId = requireEnv("INSTAGRAM_ACCOUNT_ID");

  const imageBuffer = await generateImage({
    apiKey: openAiApiKey,
    prompt: imagePrompt,
    model: process.env.OPENAI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
  });

  const imageUrl = await uploadImageToSupabase({
    bucket: process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET,
    imageBuffer,
    objectPath: buildStoragePath(digest),
    supabaseServiceRoleKey,
    supabaseUrl,
  });

  const publishResult = await publishInstagramImage({
    accessToken: instagramAccessToken,
    accountId: instagramAccountId,
    apiVersion: process.env.INSTAGRAM_API_VERSION || DEFAULT_INSTAGRAM_API_VERSION,
    caption,
    imageUrl,
  });

  console.log(`Instagram publish complete. Media ID: ${publishResult.mediaId}`);
  console.log(`Image URL: ${imageUrl}`);
}

function loadEventPayload() {
  const eventPath =
    process.env.GITHUB_EVENT_PATH ||
    process.env.INSTAGRAM_EVENT_PATH ||
    process.argv[2];

  if (!eventPath) {
    throw new Error(
      "No GitHub event payload found. Set GITHUB_EVENT_PATH or pass a JSON payload path as the first argument.",
    );
  }

  const raw = readFileSync(eventPath, "utf8");
  return JSON.parse(raw);
}

function buildUpdateDigest(event) {
  const repoName = event?.repository?.name || "repository";
  const repoFullName = event?.repository?.full_name || repoName;
  const ref = String(event?.ref || "");
  const branch = branchFromRef(ref);
  const commits = Array.isArray(event?.commits) ? event.commits : [];
  const headCommit = event?.head_commit || commits.at(-1) || null;
  const commitCount = commits.length || (headCommit ? 1 : 0);
  const actor = event?.pusher?.name || event?.sender?.login || "github";
  const compareUrl = event?.compare || null;
  const afterSha = String(event?.after || "").trim();
  const shortSha = afterSha ? afterSha.slice(0, 7) : "unknown";

  const commitSubjects = dedupe(
    (commits.length ? commits : headCommit ? [headCommit] : [])
      .map(getCommitSubject)
      .filter(Boolean)
      .filter((subject) => !/^merge (pull request|branch)/i.test(subject)),
  );

  const changedPaths = dedupe(
    commits.flatMap((commit) => [
      ...(Array.isArray(commit?.added) ? commit.added : []),
      ...(Array.isArray(commit?.modified) ? commit.modified : []),
      ...(Array.isArray(commit?.removed) ? commit.removed : []),
    ]),
  );

  const changedAreas = dedupe(changedPaths.map(toAreaLabel).filter(Boolean));
  const contributors = dedupe(
    commits
      .map((commit) => commit?.author?.name || commit?.author?.username)
      .filter(Boolean),
  );

  const summaryParts = [
    `${repoName} received ${commitCount} commit${commitCount === 1 ? "" : "s"} on ${branch}.`,
    commitSubjects.length
      ? `Main changes: ${joinNatural(commitSubjects.slice(0, 3))}.`
      : null,
    changedAreas.length
      ? `Touched areas: ${joinNatural(changedAreas.slice(0, 6))}.`
      : null,
  ].filter(Boolean);

  return {
    actor,
    afterSha,
    branch,
    changedAreas,
    changedPaths,
    commitCount,
    commitSubjects,
    compareUrl,
    contributors,
    headCommit,
    repoFullName,
    repoName,
    shortSha,
    summary: summaryParts.join(" "),
  };
}

function getSkipReason(digest) {
  const allowedBranches = parseCsv(
    process.env.INSTAGRAM_ALLOWED_BRANCHES,
    DEFAULT_ALLOWED_BRANCHES,
  );
  if (!allowedBranches.includes(digest.branch)) {
    return `branch "${digest.branch}" is not in INSTAGRAM_ALLOWED_BRANCHES`;
  }

  if (!digest.commitCount) {
    return "no commits were included in the push payload";
  }

  if (digest.actor === "github-actions[bot]") {
    return "push came from github-actions[bot]";
  }

  const skipToken = process.env.INSTAGRAM_SKIP_TOKEN || DEFAULT_SKIP_TOKEN;
  const matchedSubject = digest.commitSubjects.find((subject) =>
    subject.toLowerCase().includes(skipToken.toLowerCase()),
  );
  if (matchedSubject) {
    return `commit subject requested skip via ${skipToken}`;
  }

  return null;
}

function buildCaption(digest) {
  const repoTag = toHashtag(digest.repoName);
  const lines = [
    `${digest.repoName} just shipped a new GitHub update.`,
    "",
    "Highlights:",
    ...digest.commitSubjects.slice(0, 3).map((subject) => `- ${subject}`),
  ];

  if (!digest.commitSubjects.length) {
    lines.push("- Fresh repository changes landed.");
  }

  if (digest.changedAreas.length) {
    lines.push("");
    lines.push(`Touched areas: ${digest.changedAreas.slice(0, 6).join(", ")}`);
  }

  lines.push("");
  lines.push(`Branch: ${digest.branch}`);

  if (digest.compareUrl) {
    lines.push(`Compare: ${digest.compareUrl}`);
  }

  const hashtags = [repoTag, "GitHubUpdates", "BuildInPublic"]
    .map((tag) => `#${tag}`)
    .join(" ");

  lines.push("");
  lines.push(hashtags);

  return truncate(lines.join("\n"), MAX_CAPTION_LENGTH);
}

function buildImagePrompt(digest) {
  const themeLine = digest.commitSubjects.length
    ? `Core update themes: ${digest.commitSubjects.slice(0, 3).join("; ")}.`
    : "Core update theme: a meaningful software release.";

  const areaLine = digest.changedAreas.length
    ? `Subtle product cues to include: ${digest.changedAreas.slice(0, 5).join(", ")}.`
    : "Use abstract product and release motifs rather than literal screenshots.";

  return [
    `Create a square Instagram image for ${digest.repoName}, a modern fintech-style brand announcement.`,
    "Use a premium, optimistic visual direction with a soft gradient palette of peach (#F8CDA0), mint (#9EE3D6), sky blue (#8DB6FF), and deep navy (#0F172A).",
    "Show the feeling of a GitHub code update turning into a polished product improvement.",
    themeLine,
    areaLine,
    "Favor clean composition, bold shapes, elegant motion cues, dashboard-inspired cards, and abstract release energy.",
    "Do not include code screenshots, watermarks, fake app-store badges, or dense paragraphs of text.",
    "If any text appears, keep it minimal and highly legible: only a very short phrase such as 'New Update'.",
  ].join(" ");
}

async function generateImage({ apiKey, prompt, model }) {
  console.log(`Generating custom image with ${model}...`);

  const response = await requestJson("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size: "1024x1024",
      quality: "medium",
      output_format: "jpeg",
      output_compression: 85,
    }),
  });

  const base64Image = response?.data?.[0]?.b64_json;
  if (!base64Image) {
    throw new Error("OpenAI image generation did not return image data.");
  }

  return Buffer.from(base64Image, "base64");
}

async function uploadImageToSupabase({
  bucket,
  imageBuffer,
  objectPath,
  supabaseServiceRoleKey,
  supabaseUrl,
}) {
  console.log(`Ensuring public Supabase bucket "${bucket}" exists...`);
  await ensureBucket({
    bucket,
    supabaseServiceRoleKey,
    supabaseUrl,
  });

  console.log(`Uploading generated image to Supabase Storage at ${objectPath}...`);
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodePath(objectPath)}`;
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      ...supabaseHeaders(supabaseServiceRoleKey),
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "x-upsert": "true",
    },
    body: imageBuffer,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(
      `Supabase upload failed (${uploadResponse.status}): ${errorText}`,
    );
  }

  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodePath(objectPath)}`;
}

async function ensureBucket({ bucket, supabaseServiceRoleKey, supabaseUrl }) {
  const bucketUrl = `${supabaseUrl}/storage/v1/bucket/${encodeURIComponent(bucket)}`;
  const existingBucket = await fetch(bucketUrl, {
    headers: supabaseHeaders(supabaseServiceRoleKey),
  });

  if (existingBucket.ok) {
    const details = await existingBucket.json();
    if (!details?.public) {
      const updateResponse = await fetch(bucketUrl, {
        method: "PUT",
        headers: {
          ...supabaseHeaders(supabaseServiceRoleKey),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          public: true,
          allowed_mime_types: ["image/jpeg"],
        }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(
          `Failed to update Supabase bucket "${bucket}" to public (${updateResponse.status}): ${errorText}`,
        );
      }
    }
    return;
  }

  if (existingBucket.status !== 400 && existingBucket.status !== 404) {
    const errorText = await existingBucket.text();
    throw new Error(
      `Failed to inspect Supabase bucket "${bucket}" (${existingBucket.status}): ${errorText}`,
    );
  }

  const createResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(supabaseServiceRoleKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: true,
      allowed_mime_types: ["image/jpeg"],
      file_size_limit: "5MB",
    }),
  });

  if (createResponse.ok || createResponse.status === 409) {
    return;
  }

  const errorText = await createResponse.text();
  throw new Error(
    `Failed to create Supabase bucket "${bucket}" (${createResponse.status}): ${errorText}`,
  );
}

async function publishInstagramImage({
  accessToken,
  accountId,
  apiVersion,
  caption,
  imageUrl,
}) {
  console.log("Creating Instagram media container...");
  const creationId = await createInstagramContainer({
    accessToken,
    accountId,
    apiVersion,
    caption,
    imageUrl,
  });

  const initialWaitMs = Number(process.env.INSTAGRAM_CONTAINER_WAIT_MS || 5000);
  if (initialWaitMs > 0) {
    await sleep(initialWaitMs);
  }

  console.log("Publishing Instagram media container...");
  try {
    const mediaId = await publishInstagramContainer({
      accessToken,
      accountId,
      apiVersion,
      creationId,
    });
    return { creationId, mediaId };
  } catch (error) {
    const retryWaitMs = Number(
      process.env.INSTAGRAM_PUBLISH_RETRY_WAIT_MS || 15000,
    );
    console.warn(
      `Initial publish attempt failed. Retrying once after ${retryWaitMs}ms...`,
    );
    await sleep(retryWaitMs);
    const mediaId = await publishInstagramContainer({
      accessToken,
      accountId,
      apiVersion,
      creationId,
    });
    return { creationId, mediaId };
  }
}

async function createInstagramContainer({
  accessToken,
  accountId,
  apiVersion,
  caption,
  imageUrl,
}) {
  const url = `https://graph.instagram.com/${apiVersion}/${accountId}/media`;
  const response = await requestJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      access_token: accessToken,
      caption,
      image_url: imageUrl,
    }).toString(),
  });

  if (!response?.id) {
    throw new Error("Instagram media container creation did not return an ID.");
  }

  return response.id;
}

async function publishInstagramContainer({
  accessToken,
  accountId,
  apiVersion,
  creationId,
}) {
  const url = `https://graph.instagram.com/${apiVersion}/${accountId}/media_publish`;
  const response = await requestJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      access_token: accessToken,
      creation_id: creationId,
    }).toString(),
  });

  if (!response?.id) {
    throw new Error("Instagram publish did not return a media ID.");
  }

  return response.id;
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? tryParseJson(text) : null;

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      text ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

function buildStoragePath(digest) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const repoSlug = digest.repoFullName;
  return `${repoSlug}/${digest.branch}/${stamp}-${digest.shortSha}.jpg`;
}

function getCommitSubject(commit) {
  const raw = String(commit?.message || "").trim();
  if (!raw) return "";
  return raw.split("\n")[0].trim().replace(/\s+/g, " ");
}

function branchFromRef(ref) {
  if (!ref.startsWith("refs/heads/")) return ref || "unknown";
  return ref.slice("refs/heads/".length);
}

function toAreaLabel(filePath) {
  if (!filePath) return "";
  const normalized = String(filePath).replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (!parts.length) return "";

  const aliases = {
    ".github": "deployment automation",
    "my-pwa": "web app",
    "supabase": "backend",
    "automation": "automation tooling",
  };

  return aliases[parts[0]] || parts[0];
}

function supabaseHeaders(serviceRoleKey) {
  return {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
  };
}

function encodePath(value) {
  return value
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function toHashtag(value) {
  const cleaned = String(value || "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
  return cleaned || "RepoUpdate";
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function joinNatural(values) {
  const filtered = values.filter(Boolean);
  return new Intl.ListFormat("en", {
    style: "long",
    type: "conjunction",
  }).format(filtered);
}

function dedupe(values) {
  return [...new Set(values)];
}

function parseCsv(value, fallback) {
  if (!value) return fallback;
  const parsed = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return parsed.length ? parsed : fallback;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isTruthy(value) {
  return /^(1|true|yes|on)$/i.test(String(value || ""));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  const fingerprint = createHash("sha256").update(message).digest("hex").slice(0, 8);
  console.error(`Instagram automation failed [${fingerprint}]: ${message}`);
  process.exit(1);
});
