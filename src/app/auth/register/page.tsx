"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/Store";
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EyeIcon, EyeOffIcon, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const registerSchema = z.object({
    username: z.string()
        .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
        .max(50, "El nombre de usuario no puede exceder 50 caracteres")
        .regex(/^[a-zA-Z0-9]+$/, "El nombre de usuario solo puede contener letras y números"),
    email: z.string()
        .min(1, "El correo electrónico es requerido")
        .email("Ingresa un correo electrónico válido")
        .max(50, "El correo electrónico es demasiado largo"),
    password: z.string()
        .min(8, "La contraseña debe tener al menos 8 caracteres")
        .max(100, "La contraseña es demasiado larga")
        .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
        .regex(/[a-z]/, "Debe contener al menos una minúscula")
        .regex(/[0-9]/, "Debe contener al menos un número")
        .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const { registerUser, userValid, userAuth, user } = useAuthStore();

    const [globalError, setGlobalError] = useState("");
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormValues>({
        mode: "onChange",
        resolver: zodResolver(registerSchema),
        defaultValues: {
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    useEffect(() => {
        const validateUser = async () => {
            await userValid();
        };
        validateUser();
    }, [userValid]);

    useEffect(() => {
        if ((userAuth || user)) {
            router.push('/profile');
        }
    }, [user, userAuth, router]);

    const onSubmit = async (data: RegisterFormValues) => {
        setGlobalError("");
        setIsSubmitting(true);

        try {
            await registerUser(data.username, data.email, data.password);
            router.push("/auth/login");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setGlobalError(err.message);
            } else {
                setGlobalError("Ha ocurrido un error inesperado al registrarte.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md">
                <Card className="shadow-lg bg-white dark:bg-gray-800">
                    {globalError && (
                        <div className="m-4 p-3 bg-red-100 text-red-700 rounded text-center text-sm">
                            {globalError}
                        </div>
                    )}
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">Crear cuenta</CardTitle>
                        <CardDescription className="text-center text-gray-500 dark:text-gray-400">Ingresa tus datos para registrarte</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-gray-700 dark:text-gray-300" htmlFor="username">Usuario</Label>
                            <Input 
                                id="username" 
                                placeholder="Ingresa tu nombre de usuario" 
                                className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 ${errors.username ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                {...register("username")}
                            />
                            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-700 dark:text-gray-300" htmlFor="email">Correo electrónico</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="tu@ejemplo.com" 
                                className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 ${errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                {...register("email")}
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-700 dark:text-gray-300" htmlFor="password">Contraseña</Label>
                            <div className="relative">
                                <Input 
                                    id="password" 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="Ingresa tu contraseña" 
                                    className={`pr-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 ${errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                    {...register("password")}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOffIcon className="h-4 w-4 text-gray-500" />
                                    ) : (
                                        <EyeIcon className="h-4 w-4 text-gray-500" />
                                    )}
                                    <span className="sr-only">{showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}</span>
                                </Button>
                            </div>
                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-700 dark:text-gray-300" htmlFor="confirmPassword">Repetir contraseña</Label>
                            <div className="relative">
                                <Input 
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirma tu contraseña"
                                    className={`pr-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 ${errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                    {...register("confirmPassword")}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOffIcon className="h-4 w-4 text-gray-500" />
                                    ) : (
                                        <EyeIcon className="h-4 w-4 text-gray-500" />
                                    )}
                                    <span className="sr-only">{showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}</span>
                                </Button>
                            </div>
                            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4">
                        <Button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full bg-gray-500 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-primary/90 text-white"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Registrando...
                                </>
                            ) : (
                                "Registrarse"
                            )}
                        </Button>
                        <div className="text-center text-sm">
                            ¿Ya tienes una cuenta?{" "}
                            <Link href="/auth/login" className="text-slate-800 dark:text-slate-300 hover:underline font-medium">
                                Iniciar sesión
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}
