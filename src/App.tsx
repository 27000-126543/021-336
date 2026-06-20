import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import Overview from '@/pages/Overview';
import Detail from '@/pages/Detail';
import Records from '@/pages/Records';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/detail" element={<Detail />} />
          <Route path="/records" element={<Records />} />
        </Route>
      </Routes>
    </Router>
  );
}
