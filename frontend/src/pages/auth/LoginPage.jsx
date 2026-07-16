import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { authApi } from '@api/auth.api';
import { setCredentials, selectIsAuth } from '@store/slices/authSlice';
import { setPageTitle } from '@store/slices/uiSlice';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';

export default function LoginPage() {
  const dispatch       = useDispatch();
  const navigate       = useNavigate();
  const isAuth         = useSelector(selectIsAuth);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    dispatch(setPageTitle('Login'));
    if (isAuth) navigate('/', { replace: true });
  }, [isAuth]);

  const savedSlug = localStorage.getItem('sas_company_slug') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { company_slug: savedSlug, email: '', password: '' } });

  const loginMutation = useMutation({
    mutationFn: (creds) => {
      localStorage.setItem('sas_company_slug', creds.company_slug.trim());
      return authApi.login({ ...creds, company_slug: creds.company_slug.trim() });
    },
    onSuccess: (data) => {
      dispatch(setCredentials(data.data));
      toast.success(`Welcome back, ${data.data.user.name}!`);
      navigate('/', { replace: true });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-primary-600 items-center justify-center mb-4 shadow-glow">
            <BuildingStorefrontIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100">Garments POS</h1>
          <p className="text-sm text-surface-500 mt-1">Sign in to your account</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit((data) => loginMutation.mutate(data))}
          className="bg-surface-800 border border-surface-700 rounded-2xl p-6 space-y-4 shadow-card-lg"
        >
          <Input
            label="Company Code"
            type="text"
            autoComplete="organization"
            placeholder="e.g. sas-garments"
            leftIcon={<BuildingStorefrontIcon className="h-4 w-4" />}
            error={errors.company_slug?.message}
            required
            {...register('company_slug', { required: 'Company code is required.' })}
          />

          <Input
            label="Email Address"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="admin@sasgarments.com"
            leftIcon={<EnvelopeIcon className="h-4 w-4" />}
            error={errors.email?.message}
            required
            {...register('email', {
              required: 'Email is required.',
              pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email address.' },
            })}
          />

          <Input
            label="Password"
            type={showPwd ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter your password"
            leftIcon={<LockClosedIcon className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="pointer-events-auto text-surface-400 hover:text-surface-200 transition-colors"
              >
                {showPwd ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            }
            error={errors.password?.message}
            required
            {...register('password', { required: 'Password is required.' })}
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={loginMutation.isPending}
            className="mt-2"
          >
            Sign In
          </Button>
        </form>

        <p className="text-center text-xs text-surface-600 mt-6">
          Garments POS v2.0 · Cloud Mode
        </p>
      </div>
    </div>
  );
}
