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


    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();  // Hook for navigation

    const onSubmit = async (data) => {
        try {

            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            if (response.ok) {
                // console.log({
                //   message: "Login successful",
                //   id: result.user.id,
                //   access_token: result.access_token,
                // });
                // store token after login
                localStorage.setItem('access_token', result.access_token);
                // store user.id after login
                localStorage.setItem("user_id", result.user.id);
                // store user after login
                localStorage.setItem('user', JSON.stringify(result.user));
                setIsAuthenticated(result.user);  
                // Add a small delay to ensure state is updated
                setTimeout(() => {
                    navigate("/");  
                }, 100);
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
<div className="container my-5">
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <div className="col-lg-8 col-md-10">
            <div className="border p-4 rounded shadow-lg">
                <div className="row">
                    <div className="col-md-6 p-5">
                        <h2 className="text-center mb-4">Login</h2>
                        <form onSubmit={handleSubmit(onSubmit)}>
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
                        <p className="mt-3 text-center">
                            Don't have an account? <a href="/signup" className="link link-primary">Sign Up</a>
                        </p>
                    </div>

                    <div className="col-md-6 p-0 d-none d-md-block">
                        <img src={loginImg} alt="Login" className="w-100 h-100 object-fit-cover rounded-end" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
    );
}
