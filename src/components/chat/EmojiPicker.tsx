import { useState, useRef, useEffect } from 'react'
import { Search, Smile, Users, PawPrint, UtensilsCrossed, Trophy, Plane, Lightbulb, Heart, Clock, Leaf, Flag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

function codeToFlagEmoji(code: string) {
  return code.toUpperCase().split('').map((c) => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}

const FLAG_CODES = ['af','ax','al','dz','ad','ao','ag','ar','am','au','at','az','bs','bh','bd','bb','by','be','bz','bj','bt','bo','ba','bw','br','bn','bg','bf','bi','cv','kh','cm','ca','cf','td','cl','cn','co','km','cg','cd','cr','ci','hr','cu','cy','cz','dk','dj','dm','do','ec','eg','sv','gq','er','ee','sz','et','fj','fi','fr','ga','gm','ge','de','gh','gr','gd','gt','gn','gw','gy','ht','hn','hu','is','in','id','ir','iq','ie','il','it','jm','jp','jo','kz','ke','ki','kw','kg','la','lv','lb','ls','lr','ly','li','lt','lu','mg','mw','my','mv','ml','mt','mh','mr','mu','mx','fm','md','mc','mn','me','ma','mz','mm','na','nr','np','nl','nz','ni','ne','ng','kp','mk','no','om','pk','pw','ps','pa','pg','py','pe','ph','pl','pt','qa','ro','ru','rw','kn','lc','vc','ws','sm','st','sa','sn','rs','sc','sl','sg','sk','si','sb','so','za','kr','ss','es','lk','sd','sr','se','ch','sy','tw','tj','tz','th','tl','tg','to','tt','tn','tr','tm','tv','ug','ua','ae','gb','us','uy','uz','vu','va','ve','vn','ye','zm','zw']

const CATEGORIES: { label: string; icon: LucideIcon; emojis: string[]; flags?: boolean }[] = [
  {
    label: 'Smileys',
    icon: Smile,
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','💫','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾'],
  },
  {
    label: 'People',
    icon: Users,
    emojis: ['👋','🤚','🖐','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁','👅','👄','💋','🫦','👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🧑‍⚕️','👨‍⚕️','👩‍⚕️','🧑‍🎓','👨‍🎓','👩‍🎓','🧑‍🏫','👨‍🏫','👩‍🏫','🧑‍⚖️','🧑‍🌾','🧑‍🍳','👨‍🍳','👩‍🍳','🧑‍🔧','🧑‍🏭','🧑‍💼','🧑‍🔬','🧑‍💻','👨‍💻','👩‍💻','🧑‍🎤','🧑‍🎨','🧑‍✈️','🧑‍🚀','🧑‍🚒','👮','🕵️','💂','🥷','👷','🫅','🤴','👸','👳','👲','🧕','🤵','👰','🤰','🫃','🤱','👼','🎅','🤶','🧙','🧝','🧛','🧟','🧞','🧜','🧚','🧌','👹','👺','💀','👻','👽','🤖','💩','🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦','🤷','💆','💇','🚶','🧍','🧎','🏃','💃','🕺','🕴','👫','👬','👭','👨‍👩‍👦','👨‍👩‍👧','👪'],
  },
  {
    label: 'Animals',
    icon: PawPrint,
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐻‍❄️','🐼','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐦‍⬛','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🫎','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪲','🦟','🦗','🪳','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🪸','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿','🦔','🐾','🐉','🐲','🌵','🎄','🌲','🌳','🌴'],
  },
  {
    label: 'Nature',
    icon: Leaf,
    emojis: ['🌱','🌿','☘️','🍀','🎍','🎋','🍃','🍂','🍁','🍄','🐚','🪸','🪨','🌾','💐','🌷','🌹','🥀','🪷','🌺','🌸','🌼','🌻','🌞','🌝','🌛','🌜','🌚','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌙','🌟','⭐','🌠','🌌','☀️','🌤','⛅','🌥','☁️','🌦','🌧','⛈','🌩','🌨','❄️','☃️','⛄','🌬','💨','🌪','🌫','🌈','🌊','🌀','☔','⛱','⚡','🔥','💧','💦','🫧','🌍','🌎','🌏','🌐','🗺','🏔','⛰','🌋','🗻','🏕','🏖','🏜','🏝','🏞','🌅','🌄','🌠','🎇','🎆','🌃','🏙','🌆','🌇','🌉','🌁'],
  },
  {
    label: 'Food',
    icon: UtensilsCrossed,
    emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶','🫑','🌽','🥕','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','☕','🫖','🍵','🧉','🍺','🍻','🥂','🍷','🫗','🥃','🍸','🍹','🧊'],
  },
  {
    label: 'Activities',
    icon: Trophy,
    emojis: ['⚽','🏀','🏈','⚾','🥎','🏐','🏉','🥏','🎾','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸','🥌','🎿','⛷','🏂','🪂','🏋','🤼','🤸','⛹','🤺','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖','🏵','🎗','🎫','🎟','🎪','🤹','🎭','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🥁','🪘','🎷','🎺','🎸','🪕','🎻','🎲','🎯','🎳','🎮','🎰','🧩'],
  },
  {
    label: 'Travel',
    icon: Plane,
    emojis: ['🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍','🛵','🦽','🦼','🛺','🚲','🛴','🛹','🛼','🚏','🛣','🛤','⛽','🚨','🚥','🚦','🛑','🚧','⚓','🛟','⛵','🛶','🚤','🛳','⛴','🛥','🚢','✈️','🛩','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡','🛰','🚀','🛸','🪐','💺','🏔','⛰','🌋','🗻','🏕','🏖','🏜','🏝','🏞','🏟','🏛','🏗','🏘','🏚','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','🗼','🗽','🗾','🗺','🌁','🌃','🏙','🌄','🌅','🌆','🌇','🌉','🌌','🌠','🎇','🎆'],
  },
  {
    label: 'Objects',
    icon: Lightbulb,
    emojis: ['⌚','📱','📲','💻','⌨️','🖥','🖨','🖱','🖲','💽','💾','💿','📀','📷','📸','📹','🎥','📽','🎞','📞','☎️','📟','📠','📺','📻','🧭','⏱','⏲','⏰','🕰','⏳','⌛','📡','🔋','🪫','🔌','💡','🔦','🕯','🪔','🧯','🛢','💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧲','🔧','🪛','🔨','⚒','🛠','⛏','🪚','🔩','🪤','🧱','⛓','🧰','🪝','🧲','🪣','🔑','🗝','🔐','🔏','🔒','🔓','🪤','💣','🪃','🧨','🎈','🎉','🎊','🎁','🎀','🎗','🪅','🪆','🧸','🪩','🪞','🪟','🛋','🪑','🚿','🛁','🪠','🧴','🧷','🧹','🧺','🧻','🪣','🧼','🫧','🪥','🧽','🪤','🧹','🗑','🛒'],
  },
  {
    label: 'Symbols',
    icon: Heart,
    emojis: ['❤️','🧡','💛','💚','💙','🩵','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🔕','🔇','🔈','🔉','🔊','📢','📣','🔔','🔕','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','❇️','✳️','❎','💠','Ⓜ️','🌀','💤','🏧','🚾','♿','🅿️','🚹','🚺','🚻','🚼','🚫','🔝','🔛','🔜','🔚','🔙','⬆️','↗️','➡️','↘️','⬇️','↙️','⬅️','↖️','↕️','↔️','↩️','↪️','⤴️','⤵️','🔄','🔃','➕','➖','➗','✖️','♾️','💲','💱','™️','©️','®️','〰️','➰','➿','✔️','☑️','🔘','▪️','▫️','◾','◽','◼️','◻️','🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜','🔶','🔷','🔸','🔹','🔺','🔻','🔲','🔳','🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️'],
  },
  {
    label: 'Flags',
    icon: Flag,
    emojis: FLAG_CODES,
    flags: true,
  },
]

function EmojiGrid({ emojis, flags, onSelect, onSelectFlag }: { emojis: string[]; flags?: boolean; onSelect: (e: string) => void; onSelectFlag?: (code: string) => void }) {
  if (flags) {
    return (
      <div
        onClick={(e) => {
          const code = (e.target as HTMLElement).dataset.code
          if (code) onSelectFlag ? onSelectFlag(code) : onSelect(codeToFlagEmoji(code))
        }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 40px)', gap: 4, padding: '2px 6px 8px' }}
      >
        {emojis.map((code) => (
          <span key={code} data-code={code} title={code.toUpperCase()} style={{ width: 40, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, cursor: 'pointer', overflow: 'hidden' }}>
            <img src={`https://flagcdn.com/w40/${code}.png`} alt={code} style={{ width: 36, height: 24, objectFit: 'cover', borderRadius: 4, display: 'block', pointerEvents: 'none' }} />
          </span>
        ))}
      </div>
    )
  }
  return (
    <div
      onClick={(e) => {
        const emoji = (e.target as HTMLElement).dataset.emoji
        if (emoji) onSelect(emoji)
      }}
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 36px)', gap: 2, padding: '2px 6px 8px' }}
    >
      {emojis.map((e) => (
        <span key={e} data-emoji={e} style={{ width: 36, height: 36, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, cursor: 'pointer', userSelect: 'none' }}>
          {e}
        </span>
      ))}
    </div>
  )
}

function LazySection({ label, emojis, flags, onSelect, onSelectFlag, innerRef, scrollRoot }: {
  label: string; emojis: string[]; flags?: boolean; onSelect: (e: string) => void; onSelectFlag?: (code: string) => void
  innerRef: (el: HTMLDivElement | null) => void; scrollRoot: HTMLDivElement | null
}) {
  const [rendered, setRendered] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const estimatedH = Math.ceil(emojis.length / 8) * 38 + 32

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setRendered(true) },
      { root: scrollRoot, rootMargin: '300px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [scrollRoot])

  return (
    <div ref={(el) => { wrapRef.current = el; innerRef(el) }} style={{ minHeight: rendered ? undefined : estimatedH }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', padding: '6px 10px 2px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
      {rendered && <EmojiGrid emojis={emojis} flags={flags} onSelect={onSelect} onSelectFlag={onSelectFlag} />}
    </div>
  )
}

interface Props {
  onSelect: (emoji: string) => void
  onSelectFlag?: (code: string) => void
  onClose: () => void
  isClosing?: boolean
}

export function EmojiPicker({ onSelect, onSelectFlag, onClose, isClosing }: Props) {
  const [cat, setCat] = useState(0)
  const [search, setSearch] = useState('')
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('nod_recent_emoji') ?? '[]') } catch { return [] }
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

  const sections = [
    ...(recent.length > 0 ? [{ label: 'Recent', emojis: recent, flags: false }] : []),
    ...CATEGORIES.map((c) => ({ label: c.label, emojis: c.emojis, flags: c.flags ?? false })),
  ]

  function handleSelect(emoji: string) {
    const next = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, 30)
    setRecent(next)
    localStorage.setItem('nod_recent_emoji', JSON.stringify(next))
    onSelect(emoji)
  }

  function scrollToSection(sectionIdx: number) {
    setCat(sectionIdx)
    const el = sectionRefs.current[sectionIdx]
    const scroller = scrollRef.current
    if (el && scroller) {
      scroller.scrollTo({ top: el.offsetTop - 52, behavior: 'smooth' })
    }
  }

  function scrollToRecent() {
    setCat(-1)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const searchResults = search.trim()
    ? CATEGORIES.flatMap((c) => c.emojis).filter((e) => e.includes(search))
    : null

  return (
    <div
      className={isClosing ? 'emoji-picker-exit' : 'emoji-picker-enter'}
      style={{
        background: 'var(--bg-2)',
        borderTop: '1px solid var(--border)',
        borderRadius: '28px 28px 0 0',
        display: 'flex',
        flexDirection: 'column',
        height: 300,
      }}
    >
      {/* Filter row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', flexShrink: 0 }}>
        <button
          onClick={scrollToRecent}
          style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: cat === -1 ? 'var(--accent)' : 'var(--bg-3)',
            border: 'none', cursor: 'pointer',
            color: cat === -1 ? '#fff' : 'var(--text-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Clock size={16} />
        </button>

        <div style={{ display: 'flex', overflowX: 'auto', background: 'var(--bg-3)', borderRadius: 999, padding: '3px 4px', gap: 2, flex: 1 }}>
          {CATEGORIES.map((c, i) => {
            const Icon = c.icon
            return (
              <button
                key={i}
                onClick={() => scrollToSection(recent.length > 0 ? i + 1 : i)}
                style={{
                  padding: '5px 8px', borderRadius: 999, flexShrink: 0,
                  background: cat === i ? 'var(--bg-4, var(--bg-2))' : 'none',
                  border: 'none', cursor: 'pointer',
                  color: cat === i ? 'var(--accent)' : 'var(--text-3)',
                  display: 'flex', alignItems: 'center',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                <Icon size={17} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Scrollable area + floating search */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 8, left: 10, right: 10, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 20, padding: '6px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
          <Search size={13} color="var(--text-3)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emoji…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)' }}
          />
        </div>

        <div
          ref={scrollRef}
          style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingTop: 52, willChange: 'transform' }}
        >
          {searchResults ? (
            <EmojiGrid emojis={searchResults} onSelect={handleSelect} />
          ) : (
            sections.map((sec, si) => (
              <LazySection
                key={si}
                label={sec.label}
                emojis={sec.emojis}
                flags={sec.flags}
                onSelect={handleSelect}
                onSelectFlag={onSelectFlag}
                innerRef={(el) => { sectionRefs.current[si] = el }}
                scrollRoot={scrollRef.current}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
