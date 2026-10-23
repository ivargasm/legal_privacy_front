"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { forgot_password } from "../../lib/api";
import { useAuthStore } from "../../store/Store";

import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function ForgotPassword() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [message, setMessage] = useState("");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [error, setError] = useState("");
    const { url } = useAuthStore();

    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");
        setError("");

        if (!email) {
            setError("Por favor, ingrese su correo electrónico.");
            return;
        }

        setIsLoading(true)

        try {
            const data = await forgot_password(url, email);
            if (data) {
                const result = await data.json();
                setMessage(result.message);
                toast.success("¡Correo enviado!", { description: result.message });

                // Redirigir al login después de un momento para que el usuario lea el mensaje
                setTimeout(() => {
                    router.push("/auth/login");
                }, 2000);
            } else {
                setError("Error al enviar la solicitud.");
                toast.error("¡Algo salió mal!", { description: "No se pudo enviar el correo." });
            }
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : "Error al enviar la solicitud.";
            setError(errMsg);
            toast.error("Error", { description: errMsg });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className={`min-h-screen flex items-center justify-center p-4`}>

            <div className="w-full max-w-md">
                <Card className="w-full bg-white dark:bg-gray-800">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                            ¿Olvidó su contraseña?
                        </CardTitle>
                        <CardDescription className="text-gray-500 dark:text-gray-400">
                            Ingrese su correo electrónico para recibir un enlace de restablecimiento
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                                    Correo Electrónico
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="nombre@ejemplo.com"
                                        className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="mt-6">
                            <Button
                                type="submit"
                                className="w-full bg-gray-700 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-primary/90 text-white"
                                disabled={isLoading}
                            >
                                {isLoading ? "Enviando..." : "Enviar enlace de restablecimiento"}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>

        // <div className="max-w-md mx-auto mt-10 p-6 bg-white text-gray-800 rounded-lg shadow-md">
        //     <h2 className="text-2xl font-bold mb-4">Recuperar Contraseña</h2>

        //     {message && <p className="text-green-600">{message}</p>}
        //     {error && <p className="text-red-600">{error}</p>}

        //     <form onSubmit={handleSubmit} className="space-y-4">
        //         <input
        //             type="email"
        //             placeholder="Correo electrónico"
        //             className="w-full p-2 border rounded"
        //             value={email}
        //             onChange={(e) => setEmail(e.target.value)}
        //             required
        //         />
        //         <button
        //             type="submit"
        //             className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        //         >
        //             Enviar enlace
        //         </button>
        //     </form>
        // </div>
    );
}
