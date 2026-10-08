import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { FlickrClient, type PhotoImageSize } from './flickr-client.js';

export type { CallToolResult };

function text(s: string): CallToolResult {
  return { content: [{ type: 'text', text: s }] };
}

function err(s: string): CallToolResult {
  return { content: [{ type: 'text', text: `Error: ${s}` }], isError: true };
}

// ─── Tool definitions ────────────────────────────────────────────────────────

export const TOOLS: Tool[] = [
  {
    name: 'flickr_list_photos',
    description:
      "List photos from your Flickr photostream. Returns photo IDs, titles, tags, and thumbnail URLs. The response includes the current page number and total page count. If the user asks to list or see all photos, call this tool repeatedly — incrementing page by 1 each time — until you have fetched every page. Do not stop at page 1 if more pages exist.",
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' },
        per_page: {
          type: 'number',
          description: 'Photos per page, 1–500 (default: 50)',
        },
      },
    },
  },
  {
    name: 'flickr_get_photo',
    description:
      "Get full details for a single photo: title, description, all tags with their IDs, dates, and location. Optionally include the photo image as base64 so any LLM can visually analyse it.",
    inputSchema: {
      type: 'object',
      properties: {
        photo_id: { type: 'string', description: 'Flickr photo ID' },
        include_image: {
          type: 'boolean',
          description:
            'If true, fetch and return the photo as a base64 image. Enables visual analysis. Default: false.',
        },
        image_size: {
          type: 'string',
          enum: ['medium', 'large'],
          description:
            'When include_image is true, which Flickr size to return via photos.getSizes. medium (~500px long edge, default) or large (~1600px, preferring Large 1600 with fallback to the largest non-original size). Ignored when include_image is false.',
        },
      },
      required: ['photo_id'],
    },
  },
  {
    name: 'flickr_get_exif',
    description:
      'Get the EXIF/camera metadata for a photo: camera model, lens, shutter speed, aperture, ISO, GPS coordinates, etc. Useful context for generating accurate tags and descriptions.',
    inputSchema: {
      type: 'object',
      properties: {
        photo_id: { type: 'string', description: 'Flickr photo ID' },
      },
      required: ['photo_id'],
    },
  },
  {
    name: 'flickr_search_my_photos',
    description:
      "Search your own photos by keyword, tags, or both. Only searches your own library — never other users' photos. The response includes the current page number and total page count. If the user wants all matching results, call repeatedly incrementing page until all pages are fetched.",
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Full-text search against title, description, and tags' },
        tags: { type: 'string', description: 'Comma-separated tags to filter by' },
        tag_mode: {
          type: 'string',
          enum: ['any', 'all'],
          description: 'Whether photos must match any or all of the given tags (default: any)',
        },
        page: { type: 'number', description: 'Page number (default: 1)' },
        per_page: { type: 'number', description: 'Results per page, 1–500 (default: 50)' },
      },
    },
  },
  {
    name: 'flickr_get_albums',
    description: 'List your Flickr albums (photosets) with their titles, descriptions, and photo counts. The response includes the current page number and total page count. If the user wants all albums, call repeatedly incrementing page until all pages are fetched.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' },
        per_page: { type: 'number', description: 'Albums per page, 1–500 (default: 50)' },
      },
    },
  },
  {
    name: 'flickr_get_album_photos',
    description: 'List the photos inside a specific album. The response includes the current page number and total page count. If the user wants all photos in the album, call repeatedly incrementing page until all pages are fetched.',
    inputSchema: {
      type: 'object',
      properties: {
        album_id: { type: 'string', description: 'The album (photoset) ID' },
        page: { type: 'number', description: 'Page number (default: 1)' },
        per_page: { type: 'number', description: 'Photos per page, 1–500 (default: 50)' },
      },
      required: ['album_id'],
    },
  },
  {
    name: 'flickr_add_tags',
    description:
      'Add tags to a photo. When dry_run is true (the default), returns a preview of what would be added without making any changes — use this to confirm with the user before writing.\n\n' +
      'WORKFLOW: Before generating tags, always call flickr_get_photo (with include_image: true when possible) and flickr_get_exif to understand the subject, location, and shooting conditions. Visual analysis produces better tags than relying on title/description alone.\n\n' +
      'FLICKR TAGGING BEST PRACTICES:\n\n' +
      'Target around 20 tags. The hard platform limit is 75, but more tags means less precision in the audience you reach — each tag should earn its place. Padding to a high count with weak tags dilutes the engaged audience who finds the photo, which indirectly hurts its performance in Flickr\'s Explore algorithm.\n\n' +
      'Cover these categories where applicable:\n' +
      '• Subject/content — what is in the photo, at both broad and specific levels (e.g. "dog" AND "golden retriever" — include both so the photo appears in wide and narrow searches)\n' +
      '• Location — tag at each geographic level that applies: continent, country, city, neighbourhood, venue (e.g. "europe", "france", "paris", "montmartre", "sacre coeur")\n' +
      '• Genre/style — photography genre or technique (e.g. "street photography", "portrait", "macro", "long exposure", "black and white", "bokeh")\n' +
      '• Mood/atmosphere — optional but useful (e.g. "moody", "minimalist", "golden hour", "blue hour")\n\n' +
      'NEVER add:\n' +
      '• Generic noise tags: "photo", "image", "picture", "flickr", "camera" — zero discovery value\n' +
      '• Irrelevant popular tags added only for traffic — Flickr\'s spam policy hides photos from search for this and can trigger Trust & Safety warnings or account termination\n' +
      '• Tags unrelated to the actual photo content\n\n' +
      'Format: multi-word tags (e.g. "long exposure") are passed as single strings; the server handles quoting automatically. Lowercase preferred.',
    inputSchema: {
      type: 'object',
      properties: {
        photo_id: { type: 'string', description: 'Flickr photo ID' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Tags to add. Target around 20 relevant tags total (hard limit: 75 per photo). Multi-word tags (e.g. "golden hour", "long exposure") are supported — pass as single strings. Lowercase preferred. Never include noise tags like "photo" or "image", and never add irrelevant tags for traffic — Flickr treats this as spam and hides photos from search.',
        },
        dry_run: {
          type: 'boolean',
          description: 'Preview mode — show what would happen without writing. Default: true.',
        },
      },
      required: ['photo_id', 'tags'],
    },
  },
  {
    name: 'flickr_remove_tag',
    description:
      'Remove a tag from a photo by its text. When dry_run is true (the default), returns a preview without making changes.',
    inputSchema: {
      type: 'object',
      properties: {
        photo_id: { type: 'string', description: 'Flickr photo ID' },
        tag: { type: 'string', description: 'The tag text to remove' },
        dry_run: {
          type: 'boolean',
          description: 'Preview mode — show what would happen without writing. Default: true.',
        },
      },
      required: ['photo_id', 'tag'],
    },
  },
  {
    name: 'flickr_get_unprocessed_photos',
    description:
      'Find photos that need processing — missing tags, missing description, or still using a raw camera filename (DSC*, IMG_*, Lightroom export suffixes, etc.). Also returns photos with partial processing (e.g. has tags but no description). Use this as the entry point for the full processing workflow, then process each result with flickr_process_photo.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'flickr_process_photo',
    description:
      'Apply a complete set of metadata to a photo in one shot: title, description, tags, and group assignments. No dry_run — designed for the automated full-processing workflow.\n\n' +
      'WORKFLOW — always do these steps before calling:\n' +
      '1. Call flickr_get_photo (include_image: true) AND flickr_get_exif in parallel\n' +
      '2. Visually analyse the image and read the EXIF data\n' +
      '3. Generate all metadata:\n' +
      '   • Title — a descriptive name if the current title is a raw filename; omit if already good\n' +
      '   • Description — 1–2 sentences, factual, no em-dashes\n' +
      '   • Tags — ~20 relevant tags: subject (broad AND specific), location chain (continent→venue), genre/style, mood. PLUS gear tags from EXIF: camera body (e.g. "sony a7 iv", "canon r5", "fujifilm xt5") and focal length/lens (e.g. "85mm", "24-70mm"). Follow Flickr tagging best practices.\n' +
      '   • Groups — run flickr_search_groups for the photo\'s main subjects; pick 2–3 active groups\n' +
      '4. Call this tool with all of the above at once\n' +
      '5. After processing, call flickr_get_albums and suggest which existing album the photo belongs in\n\n' +
      'GROUP HANDLING: auto-joins groups the user is not yet a member of before adding. Throttle errors (group photo limit reached) are skipped gracefully — do not retry.\n\n' +
      'PARTIAL PROCESSING: if the photo already has tags but no description (or vice versa), only supply the missing fields — do not overwrite what is already there.',
    inputSchema: {
      type: 'object',
      properties: {
        photo_id: { type: 'string', description: 'Flickr photo ID' },
        title: { type: 'string', description: 'New title. Omit to keep existing.' },
        description: { type: 'string', description: 'New description. Omit to keep existing.' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to add. ~20 relevant tags including gear from EXIF. Follows Flickr tagging best practices.',
        },
        group_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Group nsids to add the photo to. Auto-joins groups not yet joined. Get IDs from flickr_search_groups.',
        },
      },
      required: ['photo_id'],
    },
  },
  {
    name: 'flickr_search_groups',
    description:
      'Search Flickr groups by keyword. Returns group names, IDs (nsid), member counts, and pool sizes. Use this to find relevant groups before adding photos with flickr_add_to_group. Favour groups with higher member counts and pool sizes as a signal of activity. You must be a member of a group before you can add photos to it.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search keyword, e.g. "drift photography" or "michigan landscape"',
        },
        per_page: {
          type: 'number',
          description: 'Number of results to return, max 500 (default: 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'flickr_join_group',
    description:
      'Join a Flickr group so photos can be added to its pool. Use flickr_search_groups first to find the group ID. Accepts group rules automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        group_id: {
          type: 'string',
          description: 'Flickr group ID (nsid), e.g. "12345678@N00". Get this from flickr_search_groups.',
        },
      },
      required: ['group_id'],
    },
  },
  {
    name: 'flickr_add_to_group',
    description:
      'Add a photo to a Flickr group pool. You must already be a member of the group. When dry_run is true (the default), previews the action without making changes.',
    inputSchema: {
      type: 'object',
      properties: {
        photo_id: { type: 'string', description: 'Flickr photo ID' },
        group_id: {
          type: 'string',
          description: 'Flickr group ID (nsid), e.g. "12345678@N00". Get this from flickr_search_groups.',
        },
        dry_run: {
          type: 'boolean',
          description: 'Preview mode — show what would happen without writing. Default: true.',
        },
      },
      required: ['photo_id', 'group_id'],
    },
  },
  {
    name: 'flickr_set_metadata',
    description:
      'Set the title and/or description of a photo. When dry_run is true (the default), returns a preview of the changes without writing them.',
    inputSchema: {
      type: 'object',
      properties: {
        photo_id: { type: 'string', description: 'Flickr photo ID' },
        title: { type: 'string', description: 'New title (omit to keep existing)' },
        description: { type: 'string', description: 'New description (omit to keep existing)' },
        dry_run: {
          type: 'boolean',
          description: 'Preview mode — show what would happen without writing. Default: true.',
        },
      },
      required: ['photo_id'],
    },
  },
];

// ─── Tool handlers ────────────────────────────────────────────────────────────

export async function handleTool(
  name: string,
  args: Record<string, unknown>,
  client: FlickrClient
): Promise<CallToolResult> {
  try {
    switch (name) {
      case 'flickr_list_photos': {
        const page = Number(args['page'] ?? 1);
        const perPage = Number(args['per_page'] ?? 50);
        const result = await client.listPhotos(page, perPage);

        const lines = result.photos.map(p =>
          `ID: ${p.id} | Title: ${p.title}${p.tags ? ` | Tags: ${p.tags}` : ''}${p.url_m ? ` | URL: ${p.url_m}` : ''}`
        );
        return text(
          `Page ${page}/${result.pages} — ${result.total} total photos\n\n${lines.join('\n')}`
        );
      }

      case 'flickr_get_photo': {
        const photoId = String(args['photo_id']);
        const includeImage = Boolean(args['include_image'] ?? false);
        const imageSizeArg = args['image_size'];
        const imageSize: PhotoImageSize =
          imageSizeArg === 'large' || imageSizeArg === 'medium' ? imageSizeArg : 'medium';

        const photo = await client.getPhoto(photoId);
        const tags = photo.tags?.tag?.map(t => t.raw).join(', ') ?? '(none)';
        const photoUrl = photo.urls?.url?.find(u => u.type === 'photopage')?._content ?? '';

        const summary =
          `Photo ID: ${photo.id}\n` +
          `Title: ${photo.title._content}\n` +
          `Description: ${photo.description._content || '(empty)'}\n` +
          `Tags: ${tags}\n` +
          `Taken: ${photo.dates?.taken ?? 'unknown'}\n` +
          `URL: ${photoUrl}`;

        if (!includeImage) {
          return text(summary);
        }

        const imageData = await client.getPhotoImageBase64(photoId, imageSize);
        if (!imageData) {
          return text(`${summary}\n\n(Image could not be fetched)`);
        }

        const imageMeta =
          `Image size: ${imageData.label} (${imageData.width}×${imageData.height}px)`;
        const summaryWithImage = `${summary}\n${imageMeta}`;

        return {
          content: [
            { type: 'text' as const, text: summaryWithImage },
            { type: 'image' as const, data: imageData.data, mimeType: imageData.mimeType },
          ],
        };
      }

      case 'flickr_get_exif': {
        const photoId = String(args['photo_id']);
        const exif = await client.getExif(photoId);

        if (!exif.length) {
          return text('No EXIF data available for this photo.');
        }

        const lines = exif.map(
          e => `${e.label}: ${e.clean?._content ?? e.raw._content}`
        );
        return text(lines.join('\n'));
      }

      case 'flickr_search_my_photos': {
        const result = await client.searchMyPhotos({
          text: args['text'] as string | undefined,
          tags: args['tags'] as string | undefined,
          tagMode: args['tag_mode'] as 'any' | 'all' | undefined,
          page: Number(args['page'] ?? 1),
          perPage: Number(args['per_page'] ?? 50),
        });

        if (!result.photos.length) {
          return text('No photos matched your search.');
        }

        const lines = result.photos.map(p =>
          `ID: ${p.id} | Title: ${p.title}${p.tags ? ` | Tags: ${p.tags}` : ''}${p.url_m ? ` | URL: ${p.url_m}` : ''}`
        );
        return text(
          `${result.total} results (page ${args['page'] ?? 1}/${result.pages})\n\n${lines.join('\n')}`
        );
      }

      case 'flickr_get_albums': {
        const result = await client.getAlbums(
          Number(args['page'] ?? 1),
          Number(args['per_page'] ?? 50)
        );

        const lines = result.albums.map(
          a =>
            `ID: ${a.id} | "${a.title._content}" | ${a.count_photos ?? a.photos} photos` +
            (a.description._content ? ` | ${a.description._content.slice(0, 60)}` : '')
        );
        return text(`${result.total} albums\n\n${lines.join('\n')}`);
      }

      case 'flickr_get_album_photos': {
        const albumId = String(args['album_id']);
        const result = await client.getAlbumPhotos(
          albumId,
          Number(args['page'] ?? 1),
          Number(args['per_page'] ?? 50)
        );

        const lines = result.photos.map(p =>
          `ID: ${p.id} | Title: ${p.title}${p.tags ? ` | Tags: ${p.tags}` : ''}`
        );
        return text(
          `Album "${result.title}" — ${result.total} photos\n\n${lines.join('\n')}`
        );
      }

      case 'flickr_add_tags': {
        const photoId = String(args['photo_id']);
        const tags = (args['tags'] as string[]).filter(t => t.trim());
        const dryRun = Boolean(args['dry_run'] ?? true);

        if (!tags.length) {
          return err('No tags provided.');
        }

        const photo = await client.getPhoto(photoId);
        const existing = photo.tags?.tag?.map(t => t._content.toLowerCase()) ?? [];
        const toAdd = tags.filter(t => !existing.includes(t.toLowerCase()));
        const alreadyPresent = tags.filter(t => existing.includes(t.toLowerCase()));

        let preview =
          `Photo: "${photo.title._content}" (${photoId})\n` +
          `Tags to add: ${toAdd.length ? toAdd.join(', ') : '(none — all already present)'}\n` +
          (alreadyPresent.length ? `Already present (skipped): ${alreadyPresent.join(', ')}\n` : '');

        if (dryRun) {
          return text(`[DRY RUN — no changes made]\n\n${preview}\nCall again with dry_run: false to apply.`);
        }

        if (!toAdd.length) {
          return text(`${preview}\nNo new tags to add.`);
        }

        await client.addTags(photoId, toAdd);
        return text(`[APPLIED]\n\n${preview}\n✓ Tags added successfully.`);
      }

      case 'flickr_remove_tag': {
        const photoId = String(args['photo_id']);
        const tagText = String(args['tag']);
        const dryRun = Boolean(args['dry_run'] ?? true);

        const photo = await client.getPhoto(photoId);
        const match = photo.tags?.tag?.find(
          t =>
            t._content.toLowerCase() === tagText.toLowerCase() ||
            t.raw.toLowerCase() === tagText.toLowerCase()
        );

        const preview =
          `Photo: "${photo.title._content}" (${photoId})\n` +
          (match
            ? `Tag to remove: "${match.raw}" (ID: ${match.id})`
            : `Tag "${tagText}" not found on this photo.`);

        if (!match) {
          return text(preview);
        }

        if (dryRun) {
          return text(`[DRY RUN — no changes made]\n\n${preview}\nCall again with dry_run: false to apply.`);
        }

        await client.removeTag(photoId, tagText);
        return text(`[APPLIED]\n\n${preview}\n✓ Tag removed successfully.`);
      }

      case 'flickr_get_unprocessed_photos': {
        const RAW_TITLE = /^(DSC|IMG_|DSCF|DSCN|MVI_|DSC_|_DSC|P\d{3,}|\d{8}_\d{4,})/i;
        const EXPORT_SUFFIX = /-Edit[-_]|-Export[-_]|-HDR\b|-Pano\b/i;

        let page = 1;
        let totalPages = 1;
        const allPhotos: Array<{ id: string; title: string; tags?: string; description?: string }> = [];

        do {
          const result = await client.listPhotos(page, 500);
          allPhotos.push(...result.photos);
          totalPages = result.pages;
          page++;
        } while (page <= totalPages);

        const unprocessed = allPhotos
          .map(p => {
            const missing: string[] = [];
            if (!p.tags?.trim()) missing.push('tags');
            if (!p.description?.trim()) missing.push('description');
            if (RAW_TITLE.test(p.title) || EXPORT_SUFFIX.test(p.title)) missing.push('title');
            return { id: p.id, title: p.title, missing };
          })
          .filter(p => p.missing.length > 0);

        if (!unprocessed.length) {
          return text('All photos are fully processed — nothing to do.');
        }

        const lines = unprocessed.map(p =>
          `ID: ${p.id} | "${p.title}" | Missing: ${p.missing.join(', ')}`
        );
        return text(`${unprocessed.length} photo(s) need processing:\n\n${lines.join('\n')}`);
      }

      case 'flickr_process_photo': {
        const photoId = String(args['photo_id']);
        const title = args['title'] !== undefined ? String(args['title']) : undefined;
        const description = args['description'] !== undefined ? String(args['description']) : undefined;
        const tags = args['tags'] as string[] | undefined;
        const groupIds = args['group_ids'] as string[] | undefined;

        const results: string[] = [];
        const photo = await client.getPhoto(photoId);
        const currentTitle = photo.title._content;

        // Title + description
        if (title !== undefined || description !== undefined) {
          const newTitle = title ?? currentTitle;
          const newDesc = description ?? photo.description._content;
          await client.setMetadata(photoId, newTitle, newDesc);
          if (title) results.push(`Title: "${currentTitle}" → "${title}"`);
          if (description) results.push(`Description set.`);
        }

        // Tags
        if (tags?.length) {
          const existing = photo.tags?.tag?.map(t => t._content.toLowerCase()) ?? [];
          const toAdd = tags.filter(t => !existing.includes(t.toLowerCase()));
          if (toAdd.length) {
            await client.addTags(photoId, toAdd);
            results.push(`Tags added (${toAdd.length}): ${toAdd.join(', ')}`);
          } else {
            results.push('Tags: all already present, nothing added.');
          }
        }

        // Groups — auto-join then add
        if (groupIds?.length) {
          const currentGroups = await client.getPhotoGroups(photoId);
          const inGroups = new Set(currentGroups.map(g => g.id));

          for (const groupId of groupIds) {
            if (inGroups.has(groupId)) {
              results.push(`Group ${groupId}: already in pool (skipped).`);
              continue;
            }
            try {
              await client.addToGroup(photoId, groupId);
              results.push(`Group ${groupId}: added.`);
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              if (msg.includes('2')) {
                try {
                  await client.joinGroup(groupId);
                  await client.addToGroup(photoId, groupId);
                  results.push(`Group ${groupId}: joined and added.`);
                } catch (e2) {
                  results.push(`Group ${groupId}: failed — ${e2 instanceof Error ? e2.message : String(e2)}`);
                }
              } else if (msg.includes('5') || msg.includes('6')) {
                results.push(`Group ${groupId}: throttled or already in pool (skipped).`);
              } else {
                results.push(`Group ${groupId}: error — ${msg}`);
              }
            }
          }
        }

        const finalTitle = title ?? currentTitle;
        return text(`[PROCESSED] "${finalTitle}" (${photoId})\n\n${results.join('\n')}`);
      }

      case 'flickr_search_groups': {
        const query = String(args['query']);
        const perPage = Number(args['per_page'] ?? 10);
        const result = await client.searchGroups(query, perPage);

        if (!result.groups.length) {
          return text(`No groups found for "${query}".`);
        }

        const lines = result.groups.map(g =>
          `ID: ${g.nsid} | "${g.name}" | ${g.members.toLocaleString()} members | ${g.pool_count.toLocaleString()} photos`
        );
        return text(
          `${result.total} groups found for "${query}" (showing ${result.groups.length}):\n\n${lines.join('\n')}`
        );
      }

      case 'flickr_join_group': {
        const groupId = String(args['group_id']);
        try {
          await client.joinGroup(groupId);
          return text(`✓ Joined group ${groupId} successfully.`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes('3')) return text(`Already a member of group ${groupId}.`);
          throw e;
        }
      }

      case 'flickr_add_to_group': {
        const photoId = String(args['photo_id']);
        const groupId = String(args['group_id']);
        const dryRun = Boolean(args['dry_run'] ?? true);

        const [photo, currentGroups] = await Promise.all([
          client.getPhoto(photoId),
          client.getPhotoGroups(photoId),
        ]);

        const alreadyIn = currentGroups.find(g => g.id === groupId);

        const preview =
          `Photo: "${photo.title._content}" (${photoId})\n` +
          (alreadyIn
            ? `Already in group: "${alreadyIn.title}" — no action needed.`
            : `Add to group ID: ${groupId}`);

        if (alreadyIn) {
          return text(preview);
        }

        if (dryRun) {
          return text(`[DRY RUN — no changes made]\n\n${preview}\nCall again with dry_run: false to apply.`);
        }

        try {
          await client.addToGroup(photoId, groupId);
          return text(`[APPLIED]\n\n${preview}\n✓ Photo added to group successfully.`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes('6')) {
            return text(`Photo "${photo.title._content}" is already in this group pool.`);
          }
          if (msg.includes('2')) {
            return err(`You are not a member of group ${groupId}. Join the group on Flickr first.`);
          }
          throw e;
        }
      }

      case 'flickr_set_metadata': {
        const photoId = String(args['photo_id']);
        const dryRun = Boolean(args['dry_run'] ?? true);

        const photo = await client.getPhoto(photoId);
        const currentTitle = photo.title._content;
        const currentDesc = photo.description._content;

        const newTitle = args['title'] !== undefined ? String(args['title']) : currentTitle;
        const newDesc = args['description'] !== undefined ? String(args['description']) : currentDesc;

        const preview =
          `Photo: "${currentTitle}" (${photoId})\n\n` +
          `Title:  ${currentTitle === newTitle ? '(unchanged)' : `"${currentTitle}" → "${newTitle}"`}\n` +
          `Description: ${currentDesc === newDesc ? '(unchanged)' : `\n  Before: ${currentDesc || '(empty)'}\n  After:  ${newDesc}`}`;

        if (currentTitle === newTitle && currentDesc === newDesc) {
          return text(`${preview}\n\nNo changes to make.`);
        }

        if (dryRun) {
          return text(`[DRY RUN — no changes made]\n\n${preview}\nCall again with dry_run: false to apply.`);
        }

        await client.setMetadata(photoId, newTitle, newDesc);
        return text(`[APPLIED]\n\n${preview}\n\n✓ Metadata updated successfully.`);
      }

      default:
        return err(`Unknown tool: ${name}`);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(message);
  }
}
