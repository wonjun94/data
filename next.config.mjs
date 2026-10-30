/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint는 설치하지 않았으므로 빌드 중 린트는 건너뛴다. 타입 검사는 빌드에서 그대로 한다.
  eslint: { ignoreDuringBuilds: true },
}

export default nextConfig
