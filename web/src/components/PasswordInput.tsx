import { useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";

export default function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input {...props} type={visible ? "text" : "password"} className="input" style={{ paddingRight: 40, ...props.style }} />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        style={{
          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer", padding: 4,
          color: "var(--text-muted)", display: "flex", alignItems: "center",
        }}
        tabIndex={-1}
      >
        {visible ? <EyeSlash size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
