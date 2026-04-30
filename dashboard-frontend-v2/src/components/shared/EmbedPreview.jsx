import { intToHexColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

/**
 * EmbedPreview — معاينة شكل Discord Embed
 *
 * @example
 *   <EmbedPreview
 *     embed={{ title, description, color, footer, ... }}
 *     username="Lyn"
 *     replacePlaceholders={(text) => text.replace('{user}', '@username')}
 *   />
 */
export function EmbedPreview({
  embed = {},
  username = 'Lyn',
  avatarLetter = 'L',
  text,
  replacePlaceholders,
  className,
}) {
  const replace = (txt) => {
    if (!txt) return txt;
    return replacePlaceholders ? replacePlaceholders(txt) : txt;
  };

  const color = embed.color || 0x9b59b6;
  const hasEmbed = embed.title || embed.description || embed.footer || embed.image || embed.thumbnail;

  return (
    <div className={cn('rounded-lg bg-[#36393f] p-4 text-white', className)}>
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-bold flex-shrink-0">
          {avatarLetter}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-semibold text-violet-300">{username}</span>
            <span className="text-xs bg-violet-500 text-white px-1.5 py-0.5 rounded">
              BOT
            </span>
            <span className="text-xs text-gray-400">اليوم في 4:20 م</span>
          </div>

          {/* Plain text content */}
          {text && (
            <div className="text-sm text-gray-100 whitespace-pre-wrap mb-2">
              {replace(text)}
            </div>
          )}

          {/* Embed */}
          {hasEmbed && (
            <div
              className="rounded border-s-4 bg-[#2f3136] p-3 max-w-md"
              style={{ borderInlineStartColor: intToHexColor(color) }}
            >
              {/* Author */}
              {embed.author?.name && (
                <div className="flex items-center gap-2 mb-2">
                  {embed.author.iconUrl && (
                    <div className="w-6 h-6 rounded-full bg-gray-600" />
                  )}
                  <span className="text-sm font-medium">{replace(embed.author.name)}</span>
                </div>
              )}

              {/* Title */}
              {embed.title && (
                <div className="font-bold text-base mb-1">{replace(embed.title)}</div>
              )}

              {/* Description */}
              {embed.description && (
                <div className="text-sm text-gray-300 whitespace-pre-wrap mb-2">
                  {replace(embed.description)}
                </div>
              )}

              {/* Fields */}
              {embed.fields?.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  {embed.fields.map((field, i) => (
                    <div
                      key={i}
                      className={cn(
                        'text-xs',
                        field.inline ? 'sm:col-span-1' : 'sm:col-span-2',
                      )}
                    >
                      <div className="font-bold mb-0.5">{replace(field.name)}</div>
                      <div className="text-gray-300">{replace(field.value)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Image */}
              {embed.image && (
                <div className="mt-2 rounded overflow-hidden bg-gray-700 h-32 flex items-center justify-center text-xs text-gray-400">
                  📷 صورة
                </div>
              )}

              {/* Thumbnail (top right) */}
              {embed.thumbnail === 'avatar' && (
                <div className="absolute top-3 left-3 w-12 h-12 rounded bg-violet-500/30 flex items-center justify-center text-xs text-white">
                  👤
                </div>
              )}

              {/* Footer */}
              {embed.footer && (
                <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
                  {replace(embed.footer)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
