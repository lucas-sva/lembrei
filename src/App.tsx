import { BrowserRouter, Route, Routes } from 'react-router-dom'
import DecksPage  from './pages/DecksPage'
import ReviewPage from './pages/ReviewPage'
import EditorPage from './pages/EditorPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                    element={<DecksPage />} />
        <Route path="/revisar/:deckId"     element={<ReviewPage />} />
        <Route path="/editor/:deckId"      element={<EditorPage />} />
        <Route path="/editor/:deckId/:cartaoId" element={<EditorPage />} />
      </Routes>
    </BrowserRouter>
  )
}
