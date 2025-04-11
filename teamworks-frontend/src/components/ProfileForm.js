import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";

export default function ProfileForm() {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm();

    const [saved, setSaved] = useState(false);
    const [firstName, setFirstName] = useState("");

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setFirstName(user.firstName || "");
            setValue("firstName", user.firstName || "");
            setValue("lastName", user.lastName || "");
            setValue("email", user.email || "");
        }
    }, [setValue]);

    const onSubmit = (data) => {
        console.log("Updated Profile:", data);
        setSaved(true);
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card shadow-sm">
                        <div className="card-body p-5">
                            <h2 className="card-title mb-4 text-center">
                                {firstName ? `Hello  ${firstName}` : "My Profile"}
                            </h2>

                            {saved && (
                                <div className="alert alert-success text-center" role="alert">
                                    Profile saved successfully!
                                </div>
                            )}

                            <form onSubmit={handleSubmit(onSubmit)} className="row g-4">
                                <div className="col-md-6">
                                    <label className="form-label">First Name</label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.firstName ? "is-invalid" : ""}`}
                                        {...register("firstName", { required: "First name is required" })}
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
                                    ></textarea>
                                </div>

                                <div className="col-12">
                                    <button type="submit" className="btn btn-primary w-100">
                                        Save Profile
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
