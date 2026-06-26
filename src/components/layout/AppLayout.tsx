import { Sidebar } from './Sidebar'
import { ChatPage } from '../../pages/ChatPage'

export function AppLayout() {
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <Sidebar />
      <ChatPage />
    </div>
  )
}
