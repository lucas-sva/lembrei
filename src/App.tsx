import { BrowserRouter, Route, Routes } from 'react-router-dom'
import PreparacoesPage from './pages/PreparacoesPage'
import DecksPage       from './pages/DecksPage'
import ReviewPage      from './pages/ReviewPage'
import EditorPage      from './pages/EditorPage'
import PainelPage      from './pages/PainelPage'
import EstatisticasPage from './pages/EstatisticasPage'
import ImportarPage    from './pages/ImportarPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                                          element={<PreparacoesPage />} />
        <Route path="/preparacao/:prepId"                        element={<DecksPage />} />
        <Route path="/revisar/:deckId"                           element={<ReviewPage />} />
        <Route path="/editor/:deckId"                            element={<EditorPage />} />
        <Route path="/editor/:deckId/:cartaoId"                  element={<EditorPage />} />
        <Route path="/painel/:deckId"                            element={<PainelPage />} />
        <Route path="/estatisticas"                              element={<EstatisticasPage />} />
        <Route path="/importar/:deckId"                          element={<ImportarPage />} />
      </Routes>
    </BrowserRouter>
  )
}
