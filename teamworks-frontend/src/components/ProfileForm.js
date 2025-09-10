import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import axios from "axios";

export default function ProfileForm() {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm();

    const [saved, setSaved] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setFirstName(user.firstName || "");
            setValue("firstName", user.firstName || "");
            setValue("lastName", user.lastName || "");
            setValue("email", user.email || "");
            setValue("bio", user.bio || "");
        }
    }, [setValue]);

    const toggleEditMode = () => {
        setIsEditing(!isEditing);
        setError("");
        setSaved(false);
    };

    const onSubmit = async (data) => {
        setLoading(true);
        setError("");
        setSaved(false);

        try {
            const storedUser = localStorage.getItem("user");
            if (!storedUser) {
                setError("User not found. Please log in again.");
                return;
            }

            const user = JSON.parse(storedUser);
            const userId = user.id;

            const response = await axios.put(`http://localhost:5001/users/${userId}`, {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                bio: data.bio || ""
            });

            if (response.status === 200) {
                // Update localStorage with new user data
                const updatedUser = {
                    ...user,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    bio: data.bio || ""
                };
                localStorage.setItem("user", JSON.stringify(updatedUser));
                
                setFirstName(data.firstName);
                setSaved(true);
                setIsEditing(false); // Exit edit mode after successful save
                
                // Hide success message after 3 seconds
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (err) {
            console.error("Error updating profile:", err);
            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else {
                setError("An error occurred while updating your profile. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card shadow-sm">
                        <div className="card-body p-5 position-relative">
                            <button 
                                className="btn btn-outline-primary position-absolute top-0 end-0 m-3"
                                onClick={toggleEditMode}
                                title={isEditing ? "Cancel editing" : "Edit profile"}
                            >
                                <i className={`bi ${isEditing ? 'bi-x-lg' : 'bi-pencil'}`}></i>
                            </button>
                            <h2 className="card-title mb-4 text-center">
                                {firstName ? `Hello  ${firstName}` : "My Profile"}
                            </h2>

                            {saved && (
                                <div className="alert alert-success text-center" role="alert">
                                    <i className="bi bi-check-circle me-2"></i>
                                    Profile saved successfully!
                                </div>
                            )}

                            {error && (
                                <div className="alert alert-danger text-center" role="alert">
                                    <i className="bi bi-exclamation-triangle me-2"></i>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit(onSubmit)} className="row g-4">
                                <div className="col-md-6">
                                    <label className="form-label">First Name</label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.firstName ? "is-invalid" : ""}`}
                                        {...register("firstName", { required: "First name is required" })}
                                        disabled={!isEditing}
                                    />
                                    {errors.firstName && (
                                        <div className="invalid-feedback">{errors.firstName.message}</div>
                                    )}
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Last Name</label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.lastName ? "is-invalid" : ""}`}
                                        {...register("lastName", { required: "Last name is required" })}
                                        disabled={!isEditing}
                                    />
                                    {errors.lastName && (
                                        <div className="invalid-feedback">{errors.lastName.message}</div>
                                    )}
                                </div>

                                <div className="col-12">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className={`form-control ${errors.email ? "is-invalid" : ""}`}
                                        {...register("email", {
                                            required: "Email is required",
                                            pattern: {
                                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                                message: "Invalid email address",
                                            },
                                        })}
                                        disabled={!isEditing}
                                    />
                                    {errors.email && (
                                        <div className="invalid-feedback">{errors.email.message}</div>
                                    )}
                                </div>

                                <div className="col-12">
                                    <label className="form-label">Bio</label>
                                    <textarea
                                        rows="4"
                                        className="form-control"
                                        placeholder="Write a few lines about yourself"
                                        {...register("bio")}
                                        disabled={!isEditing}
                                    ></textarea>
                                </div>

                                {isEditing && (
                                    <div className="col-12">
                                        <button 
                                            type="submit" 
                                            className="btn btn-primary w-100"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-save me-2"></i>
                                                    Save Profile
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
