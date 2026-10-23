"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { reset_password } from "../../lib/api";
import { useAuthStore } from "../../store/Store";
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ResetPasswordClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const { url } = useAuthStore();

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword)
    }

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword)
    }

    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");
        setError("");

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        try {
            if (token) {
                const data = await reset_password(url, password, token);
                if (data) {
                    const result = await data.json();
                    setMessage(result.message);
                    router.push("/auth/login");
                } else {
                    setError("Error al enviar la solicitud.");
                }
            } else {
                setError("Token no válido.");
            }
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message || "Error al enviar la solicitud.");
            } else {
                setError("Error al enviar la solicitud.");
            }
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            

            {message && <p className="text-green-600">{message}</p>}
            {error && <p className="text-red-600">{error}</p>}

            <form onSubmit={handleSubmit} className="w-full flex items-center justify-center">
                <Card className="w-full max-w-md shadow-lg bg-white dark:bg-gray-800">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">Restablecer contraseña</CardTitle>
                        <CardDescription className="text-center text-gray-500 dark:text-gray-400">Ingresa tu nueva contraseña para restablecer tu cuenta</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-gray-700 dark:text-gray-300" htmlFor="password">Contraseña</Label>
                            <div className="relative">
                                <Input className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Ingresa tu contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={togglePasswordVisibility}
                                >
                                    {showPassword ? (
                                        <EyeOffIcon className="h-4 w-4 text-gray-500" />
                                    ) : (
                                        <EyeIcon className="h-4 w-4 text-gray-500" />
                                    )}
                                    <span className="sr-only">{showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}</span>
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-700 dark:text-gray-300" htmlFor="confirmPassword">Repetir contraseña</Label>
                            <div className="relative">
                                <Input className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirma tu contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={toggleConfirmPasswordVisibility}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOffIcon className="h-4 w-4 text-gray-500" />
                                    ) : (
                                        <EyeIcon className="h-4 w-4 text-gray-500" />
                                    )}
                                    <span className="sr-only">{showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}</span>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                    <div className="px-6 pb-6 mt-4 flex items-center justify-center">
                        <Button
                            type="submit"
                            className="w-full bg-gray-700 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-primary/90 text-white"
                        >
                            Cambiar contraseña
                        </Button>
                    </div>
                </Card>
            </form>
        </div>
    );
}
