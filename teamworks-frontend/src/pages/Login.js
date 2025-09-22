// pages/LoginPage.js
import LoginForm from "../components/LoginForm";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
    const { handleLogin } = useAuth();
    return <LoginForm setIsAuthenticated={handleLogin} />;
}