import { Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ProjectLayout from './pages/ProjectLayout'
import CustomerStep from './pages/CustomerStep'
import PhotosStep from './pages/PhotosStep'
import ScopeStep from './pages/ScopeStep'
import EstimateStep from './pages/EstimateStep'
import SettingsPage from './pages/SettingsPage'
import RenderingsStep from './pages/RenderingsStep'
import DesignStep from './pages/DesignStep'
import ProposalStep from './pages/ProposalStep'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/project/:id" element={<ProjectLayout />}>
        <Route index element={<Navigate to="customer" replace />} />
        <Route path="customer" element={<CustomerStep />} />
        <Route path="photos" element={<PhotosStep />} />
        <Route path="scope" element={<ScopeStep />} />
        <Route path="design" element={<DesignStep />} />
        <Route path="estimate" element={<EstimateStep />} />
        <Route path="renderings" element={<RenderingsStep />} />
        <Route path="mix" element={<Navigate to="../design" replace />} />
        <Route path="proposal" element={<ProposalStep />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
