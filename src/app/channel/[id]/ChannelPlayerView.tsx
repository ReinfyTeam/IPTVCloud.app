'use client';

import Image from 'next/image';

...
                    {channel.logo ? (
                      <Image
                        src={channel.logo}
                        alt={channel.name}
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-2xl object-contain bg-slate-900 border border-white/10 p-2 shadow-lg shadow-black/50"
                      />
                    ) : (
...
                        {channel.country &&
                          channel.country !== 'UNKNOWN' &&
                          channel.country !== 'INTERNATIONAL' && (
                            <Image
                              src={`https://flagcdn.com/w20/${channel.country.toLowerCase()}.png`}
                              alt={channel.country}
                              width={20}
                              height={15}
                              className="h-3 w-4 rounded-sm"
                            />
                          )}
...

                  <button
                    onClick={() => toggleFavorite(channel.id)}
                    className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                      isFavorite(channel.id)
                        ? 'bg-amber-400/20 text-amber-400 hover:bg-amber-400/30 border border-amber-400/30'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                    }`}
                  >
                    <svg
                      className="h-4 w-4"
                      fill={isFavorite(channel.id) ? 'currentColor' : 'none'}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                      />
                    </svg>
                    {isFavorite(channel.id) ? 'Saved' : 'Save'}
                  </button>
                </div>

                <div className="pt-6 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Live Program Guide
                    </div>
                    <Link
                      href={`/epg/${encodeURIComponent(channel.id)}`}
                      className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-widest transition-colors"
                    >
                      Full Schedule →
                    </Link>
                  </div>
                  <EpgStrip channelId={channel.epgId} />
                </div>
              </div>

              <div className="h-[400px] md:h-auto">
                <CommentSection channelId={channel.id} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-white px-2">Related Channels</h3>
            <div className="flex flex-col gap-2">
              {relatedChannels.map((ch) => (
                <ChannelCard
                  key={ch.id}
                  channel={ch}
                  mode="list"
                  favorite={isFavorite(ch.id)}
                  onSelect={selectChannel}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
