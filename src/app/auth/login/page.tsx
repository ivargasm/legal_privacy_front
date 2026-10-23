"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/Store";
import Link from "next/link"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const loginSchema = z.object({
    email: z.string().email({ message: "Ingresa un correo electrónico válido" }),
    password: z.string().min(1, { message: "La contraseña es requerida" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const { url, loginUser, userValid, userAuth, user } = useAuthStore();
    
    const [globalError, setGlobalError] = useState("");
    const [showPassword, setShowPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        mode: "onChange",
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
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

    const onSubmit = async (data: LoginFormValues) => {
        setGlobalError("");
        setIsSubmitting(true);

        try {
            await loginUser(data.email, data.password, url);
            router.push("/profile");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setGlobalError(err.message);
            } else {
                setGlobalError("Ha ocurrido un error inesperado");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-gray-900">
            <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md">
                {globalError && <p className="text-red-500 text-sm mb-2 text-center">{globalError}</p>}
                
                <Card className="w-full shadow-lg bg-white dark:bg-gray-800">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">Iniciar sesión</CardTitle>
                        <CardDescription className="text-center text-gray-500 dark:text-gray-400">
                            Ingresa tus credenciales para acceder
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                                Correo electrónico
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="correo@ejemplo.com"
                                className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 ${errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                {...register("email")}
                            />
                            {errors.email && (
                                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                                    Contraseña
                                </Label>
                                <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline dark:text-blue-400">
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className={`pr-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 ${errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                    {...register("password")}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                    )}
                                </Button>
                            </div>
                            {errors.password && (
                                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                            )}
                        </div>
                        <Button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full bg-gray-500 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-primary/90 text-white"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Iniciando sesión...
                                </>
                            ) : (
                                "Iniciar sesión"
                            )}
                        </Button>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            ¿No tienes una cuenta?{" "}
                            <Link href="/auth/register" className="text-primary hover:underline dark:text-blue-400">
                                Regístrate
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}
