import { useState, ChangeEvent, useCallback } from 'react';

interface FormData {
  fullName: string;
  email: string;
  password: string;
}

type ValidationErrors = Partial<Record<keyof FormData, string>>;

export const validateRegisterForm = (data: FormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.fullName || data.fullName.trim().length < 3) {
    errors.fullName = 'نام باید حداقل ۳ کاراکتر باشد';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.email = 'ایمیل نامعتبر است';
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
  if (!data.password || data.password.length < 8) {
    errors.password = 'رمز عبور باید حداقل ۸ کاراکتر باشد';
  } else if (!passwordRegex.test(data.password)) {
    errors.password = 'رمز عبور باید شامل حروف بزرگ، کوچک و عدد باشد';
  }

  return errors;
};

export const useFormValidation = (initialData: FormData) => {
  const [data, setData] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});

  const handleChange = useCallback((field: keyof FormData) => (e: ChangeEvent<HTMLInputElement>) => {
    setData(prev => ({ ...prev, [field]: e.target.value }));
    if (touched[field]) {
      const newErrors = validateRegisterForm({ ...data, [field]: e.target.value });
      setErrors(prev => ({ ...prev, [field]: newErrors[field] }));
    }
  }, [data, touched]);

  const handleBlur = useCallback((field: keyof FormData) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const newErrors = validateRegisterForm(data);
    setErrors(prev => ({ ...prev, [field]: newErrors[field] }));
  }, [data]);

  const validate = useCallback(() => {
    const newErrors = validateRegisterForm(data);
    setErrors(newErrors);
    setTouched({ fullName: true, email: true, password: true });
    return Object.keys(newErrors).length === 0;
  }, [data]);

  return { data, errors, touched, handleChange, handleBlur, validate, setData };
};