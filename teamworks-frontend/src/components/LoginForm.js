import { useForm } from "react-hook-form";
import { useState } from "react";
import { useNavigate } from "react-router-dom";  // Import useNavigate
import loginImg from '../assets/signupIMg.jpg';

export default function LoginForm({ setIsAuthenticated }) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const [submitted, setSubmitted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();  // Hook for navigation

    const onSubmit = async (data) => {
        try {
            console.log("Sending login data to backend:", data);
            console.log("API:", process.env.REACT_APP_API_URL); // Log the API URL
            const response = await fetch("http://127.0.0.1:5001/users/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            if (response.ok) {
                setSubmitted(true);
                setIsAuthenticated(true);  
                localStorage.setItem("user", JSON.stringify(result.user));
                navigate("/");  
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error("Error logging in:", error);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="container-fluid d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
            <div className="border p-4 rounded w-75 shadow-lg">
                <div className="row w-100">
                    <div className="col-md-6 p-5">
                        <div className="card mx-auto" style={{ maxWidth: "400px" }}>
                            <div className="card-body">
                                <h2 className="card-title text-center mb-4">Login</h2>
                                {submitted ? (
                                    <p className="text-success text-center">Login successful! Redirecting...</p>
                                ) : (
                                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                        <div className="mb-3">
                                            <label htmlFor="email" className="form-label">Email</label>
                                            <input
                                                type="email"
                                                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                                id="email"
                                                {...register("email", { required: "Email is required" })}
                                            />
                                            {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
                                        </div>

                                        <div className="mb-3">
                                            <label htmlFor="password" className="form-label">Password</label>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                                                id="password"
                                                {...register("password", { required: "Password is required" })}
                                            />
                                            {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
                                        </div>

                                        <div className="form-check mb-3">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="showPassword"
                                                onChange={togglePasswordVisibility}
                                            />
                                            <label className="form-check-label" htmlFor="showPassword">
                                                Show Password
                                            </label>
                                        </div>

                                        <button type="submit" className="btn btn-primary w-100">Login</button>
                                    </form>
                                )}
                                <p className="mt-3 text-center">
                                    Don't have an account? {" "}
                                    <a href="/signup" className="link link-primary">Sign Up</a>
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="col-md-6 p-0">
                        <img src={loginImg} alt="Login" className="signup-img" />
                    </div>
                </div>
            </div>
        </div>
    );
}
