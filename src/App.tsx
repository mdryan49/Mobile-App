import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ProjectLayout from './pages/ProjectLayout'
import CustomerStep from './pages/CustomerStep'
import PhotosStep from './pages/PhotosStep'
import ComingSoon from './pages/ComingSoon'
import { Button } from './components/ui'

function SettingsPlaceholder() {
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-3xl p-6 safe-top">
      <Button variant="ghost" onClick={() => navigate('/')}>
        ← Back
      </Button>
      <ComingSoon title="Settings (PIN protected)" phase={2} pricing />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/settings" element={<SettingsPlaceholder />} />
      <Route path="/project/:id" element={<ProjectLayout />}>
        <Route index element={<Navigate to="customer" replace />} />
        <Route path="customer" element={<CustomerStep />} />
        <Route path="photos" element={<PhotosStep />} />
        <Route path="scope" element={<ComingSoon title="Measurements & scope" phase={2} />} />
        <Route path="estimate" element={<ComingSoon title="Estimate" phase={2} pricing />} />
        <Route path="renderings" element={<ComingSoon title="Renderings" phase={3} />} />
        <Route path="mix" element={<ComingSoon title="Mix & match" phase={4} pricing />} />
        <Route path="proposal" element={<ComingSoon title="Proposal PDF" phase={5} pricing />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
