// Route table: /login is public; everything else renders inside the protected Layout.
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AccountSettings from "./pages/AccountSettings";
import Dashboard from "./pages/Dashboard";
import NewRequest from "./pages/NewRequest";
import RequestDetail from "./pages/RequestDetail";
import AdminPanel from "./pages/AdminPanel";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<Layout />}>
        <Route path="/account" element={<AccountSettings />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<NewRequest />} />
        <Route path="/requests/:id" element={<RequestDetail />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Route>
    </Routes>
  );
}
