// components/InputField.js

export default function InputField({ label, type = "text", register, error }) {
    return (
      <div>
        <label className="block text-sm font-medium">{label}</label>
        <input
          type={type}
          {...register}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <p className="text-red-500 text-xs">{error.message}</p>}
      </div>
    );
  }
  