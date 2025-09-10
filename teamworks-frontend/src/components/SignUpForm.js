import { useForm } from "react-hook-form";
import { useState } from "react";
import signupImg from '../assets/signupIMg.jpg';

export default function SignUpForm() {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const [submitted, setSubmitted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const onSubmit = async (data) => {
        try {
            console.log("Sending data to backend:", data); // Log the form data
            
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });
    
            const result = await response.json();
            if (response.ok) {
                setSubmitted(true); // Show success message if the sign-up was successful
            } else {
                alert(result.error); // Show error message if something went wrong
            }
        } catch (error) {
            console.error("Error signing up:", error);
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
              {/* Form Column */}
              <div className="col-md-6 p-5">
                <h2 className="text-center mb-4">Sign Up</h2>
                {submitted ? (
                  <p className="text-success text-center">Sign-up successful!</p>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="mb-3 row">
                      <div className="col-6">
                        <label htmlFor="firstName" className="form-label">First Name</label>
                        <input
                          type="text"
                          className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                          id="firstName"
                          {...register("firstName", { required: "First Name is required" })}
                        />
                        {errors.firstName && <div className="invalid-feedback">{errors.firstName.message}</div>}
                      </div>
                      <div className="col-6">
                        <label htmlFor="lastName" className="form-label">Last Name</label>
                        <input
                          type="text"
                          className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                          id="lastName"
                          {...register("lastName", { required: "Last Name is required" })}
                        />
                        {errors.lastName && <div className="invalid-feedback">{errors.lastName.message}</div>}
                      </div>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="email" className="form-label">Email</label>
                      <input
                        type="email"
                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                        id="email"
                        {...register("email", {
                          required: "Email is required",
                          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" },
                        })}
                      />
                      {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
                    </div>

                    <div className="mb-3">
                      <label htmlFor="password" className="form-label">Password</label>
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                        id="password"
                        {...register("password", {
                          required: "Password is required",
                          minLength: { value: 6, message: "Password must be at least 6 characters" },
                        })}
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

                    <button type="submit" className="btn btn-primary w-100">Sign Up</button>
                  </form>
                )}
                <p className="mt-3 text-center">
                  Already have an account? <a href="/login" className="link link-primary">Login</a>
                </p>
              </div>

              {/* Image Column */}
              <div className="col-md-6 p-0 d-none d-md-block">
                <img src={signupImg} alt="Sign Up" className="w-100 h-100 object-fit-cover rounded-end" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
}
