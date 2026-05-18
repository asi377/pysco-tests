import { Brain, Sparkles, Shield, Clock } from 'lucide-react';

const features = [
    {
        icon: Brain,
        title: 'تست‌های علمی',
        description: 'بر اساس پرسشنامه‌های معتبر روان‌شناسی',
        color: 'from-violet-500 to-purple-500',
    },
    {
        icon: Sparkles,
        title: 'نتایج فوری',
        description: 'دریافت نتیجه بلافاصله پس از تکمیل آزمون',
        color: 'from-blue-500 to-cyan-500',
    },
    {
        icon: Shield,
        title: 'حریم خصوصی',
        description: 'اطلاعات شما کاملاً محفوظ است',
        color: 'from-emerald-500 to-teal-500',
    },
    {
        icon: Clock,
        title: 'بدون محدودیت زمانی',
        description: 'در هر زمان که می‌خواهید آزمون دهید',
        color: 'from-orange-500 to-amber-500',
    },
];

export default function Welcome() {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
            <div className="text-center max-w-3xl">
                <div className="mb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-primary-500 via-secondary-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
                        <Brain className="w-14 h-14 text-white" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 mb-4">
                        شناخت <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-600">خودت</span> شروع می‌شود
                    </h1>
                    <p className="text-xl text-slate-600 leading-relaxed">
                        با آزمون‌های شخصیت‌شناسی علمی، نقاط قوت و ضعف شخصیتی خود را بشناسید و راه رشد فردی خود را پیدا کنید.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                        >
                            <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                                <feature.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="font-bold text-slate-800 mb-2">{feature.title}</h3>
                            <p className="text-sm text-slate-500">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}