import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getSession();
  
  // Redirect logged in users to dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🐍</span>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Python LMS
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                Đăng nhập
              </Link>
              <Link href="/register" className="btn btn-primary">
                Bắt đầu học
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
              Học <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Python</span> <br />
              Hiệu quả & Thực tế
            </h1>
            <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
              Hệ thống học tập trực tuyến với bài giảng tương tác, bài tập thực hành và hệ thống chấm điểm chuyên nghiệp.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="btn btn-primary text-lg px-8 py-3">
                <i className="fa-solid fa-rocket"></i>
                Đăng ký miễn phí
              </Link>
              <Link href="/login" className="btn btn-secondary text-lg px-8 py-3">
                <i className="fa-solid fa-right-to-bracket"></i>
                Đã có tài khoản
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="mt-32 grid md:grid-cols-3 gap-8">
            <div className="card p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
                <i className="fa-solid fa-book-open text-2xl text-indigo-600"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Bài giảng tương tác</h3>
              <p className="text-gray-600">
                Nội dung được thiết kế dễ hiểu với ví dụ thực tế và code mẫu
              </p>
            </div>

            <div className="card p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                <i className="fa-solid fa-code text-2xl text-green-600"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Bài tập thực hành</h3>
              <p className="text-gray-600">
                Luyện tập với các bài tập từ cơ bản đến nâng cao, nộp bài online
              </p>
            </div>

            <div className="card p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 mx-auto bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                <i className="fa-solid fa-chart-line text-2xl text-purple-600"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Theo dõi tiến độ</h3>
              <p className="text-gray-600">
                Xem điểm số, nhận xét từ giảng viên và theo dõi quá trình học tập
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-2xl">🐍</span>
            <span className="text-xl font-bold text-white">Python LMS</span>
          </div>
          <p>© 2024 Python LMS. Made with ❤️ by AnhDuc Team</p>
        </div>
      </footer>
    </div>
  );
}
