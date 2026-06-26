import { useEffect, useRef, useState } from 'react'
import {
  doc,
  setDoc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  collection,
  addDoc,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { User } from '../../types'
import { Avatar } from '../ui/Avatar'
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react'

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }

interface Props {
  chatId: string
  type: 'audio' | 'video'
  members: Record<string, User>
  onClose: () => void
}

export function CallModal({ chatId, type, members, onClose }: Props) {
  const me = useAuthStore((s) => s.user)
  const localRef = useRef<HTMLVideoElement>(null)
  const remoteRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(type === 'audio')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const callDocId = [me?.uid, ...Object.keys(members).filter((u) => u !== me?.uid)].sort().join('_')
  const callRef = doc(db, 'calls', `${chatId}_${callDocId}`)

  useEffect(() => {
    let localStream: MediaStream
    const pc = new RTCPeerConnection(STUN)
    pcRef.current = pc

    async function start() {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      })
      setStream(localStream)
      if (localRef.current) { localRef.current.srcObject = localStream; localRef.current.muted = true }
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream))

      pc.ontrack = (e) => {
        if (remoteRef.current) remoteRef.current.srcObject = e.streams[0]
      }

      const iceCandidates = collection(db, 'calls', `${chatId}_${callDocId}`, 'offerCandidates')

      pc.onicecandidate = (e) => {
        if (e.candidate) addDoc(iceCandidates, e.candidate.toJSON())
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await setDoc(callRef, { offer: { sdp: offer.sdp, type: offer.type }, callerId: me?.uid })

      const unsub = onSnapshot(callRef, async (snap) => {
        const data = snap.data()
        if (data?.answer && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
        }
      })

      const answerCandidates = collection(db, 'calls', `${chatId}_${callDocId}`, 'answerCandidates')
      const unsub2 = onSnapshot(answerCandidates, (snap) => {
        snap.docChanges().forEach((c) => {
          if (c.type === 'added') pc.addIceCandidate(new RTCIceCandidate(c.doc.data()))
        })
      })

      return () => { unsub(); unsub2() }
    }

    start()

    return () => {
      localStream?.getTracks().forEach((t) => t.stop())
      pc.close()
    }
  }, [])

  function toggleMute() {
    stream?.getAudioTracks().forEach((t) => (t.enabled = muted))
    setMuted(!muted)
  }

  function toggleVideo() {
    stream?.getVideoTracks().forEach((t) => (t.enabled = videoOff))
    setVideoOff(!videoOff)
  }

  async function hangUp() {
    stream?.getTracks().forEach((t) => t.stop())
    pcRef.current?.close()
    await deleteDoc(callRef).catch(() => {})
    onClose()
  }

  const otherUsers = Object.values(members).filter((u) => u.uid !== me?.uid)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg)',
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      {type === 'video' ? (
        <div style={{ position: 'relative', width: '100%', maxWidth: 640, aspectRatio: '16/9', background: 'var(--bg-2)', borderRadius: 12, overflow: 'hidden' }}>
          <video ref={remoteRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <video ref={localRef} autoPlay playsInline muted style={{ position: 'absolute', bottom: 12, right: 12, width: 120, borderRadius: 8, border: '2px solid var(--border)' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {otherUsers[0] && (
            <>
              <Avatar url={otherUsers[0].avatarUrl} name={otherUsers[0].username} size={80} />
              <div style={{ fontSize: 20, fontWeight: 600 }}>{otherUsers[0].username}</div>
              <div style={{ color: 'var(--text-2)', fontSize: 14 }}>Calling…</div>
            </>
          )}
          <video ref={localRef} autoPlay playsInline muted style={{ display: 'none' }} />
          <video ref={remoteRef} autoPlay playsInline style={{ display: 'none' }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 16 }}>
        <CallBtn onClick={toggleMute} active={muted} label={muted ? 'Unmute' : 'Mute'}>
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </CallBtn>
        {type === 'video' && (
          <CallBtn onClick={toggleVideo} active={videoOff} label={videoOff ? 'Camera on' : 'Camera off'}>
            {videoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </CallBtn>
        )}
        <CallBtn onClick={hangUp} danger label="End">
          <PhoneOff size={20} />
        </CallBtn>
      </div>
    </div>
  )
}

function CallBtn({ children, onClick, active, danger, label }: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  danger?: boolean
  label: string
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: danger ? 'var(--danger)' : active ? 'var(--bg-4)' : 'var(--bg-3)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--border)',
      }}
    >
      {children}
    </button>
  )
}
