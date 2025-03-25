// pages/SignUpPage.js
import LoginForm from "../components/LoginForm";

export default function Login({ setIsAuthenticated }) {
    return <LoginForm setIsAuthenticated={setIsAuthenticated} />;
}