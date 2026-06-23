
export type LegalSection = { heading: string; body: string[] };
export type LegalDoc = { title: string; updated: string; intro: string; sections: LegalSection[] };
export type Lang = 'en' | 'vi';

const UPDATED_EN = 'June 23, 2026';
const UPDATED_VI = '23/06/2026';

export const TERMS: Record<Lang, LegalDoc> = {
  en: {
    title: 'Terms of Service',
    updated: UPDATED_EN,
    intro:
      'Mintaz is self-hosted software for deploying applications from Git. Each installation is operated independently by its own administrator ("the Operator"). By creating an account or using this instance you ("the User") agree to these Terms.',
    sections: [
      {
        heading: '1. The service',
        body: [
          'Mintaz clones a Git repository, builds a Docker image, runs it in an isolated container, and exposes it on a subdomain behind a reverse proxy and Cloudflare Tunnel.',
          'Because Mintaz is self-hosted, the Operator of this instance — not the Mintaz project authors — is responsible for its availability, data, and conduct.',
        ],
      },
      {
        heading: '2. Accounts',
        body: [
          'You are responsible for keeping your credentials secure and for all activity under your account.',
          'You must provide a valid email address. The first account created becomes the administrator.',
        ],
      },
      {
        heading: '3. Acceptable use',
        body: [
          'You may not deploy or distribute content that is illegal, infringing, malicious (malware, phishing), or that abuses shared resources (e.g. crypto-mining, denial-of-service, spam).',
          'You may not attempt to break out of your container, access other users’ data, or circumvent resource limits or security controls.',
          'You are solely responsible for the code you deploy and any data it processes.',
        ],
      },
      {
        heading: '4. Resource limits',
        body: [
          'Deployments run under per-container CPU, memory, and process limits, and accounts may be subject to quotas. The Operator may adjust these limits.',
        ],
      },
      {
        heading: '5. Third-party services',
        body: [
          'Mintaz integrates with GitHub, Docker, and Cloudflare. Your use of those services is governed by their own terms. Tokens you connect are used only to perform actions you request (clone repositories, manage DNS).',
        ],
      },
      {
        heading: '6. Suspension & termination',
        body: [
          'The Operator may suspend or remove accounts and deployments that violate these Terms or threaten the stability or security of the platform.',
          'You may stop using the service and request deletion of your account at any time.',
        ],
      },
      {
        heading: '7. Disclaimer & liability',
        body: [
          'The software is provided "as is", without warranty of any kind, as described in the MIT License. To the maximum extent permitted by law, neither the Operator nor the Mintaz authors are liable for any damages arising from use of the service.',
        ],
      },
      {
        heading: '8. Changes',
        body: [
          'These Terms may be updated from time to time. Continued use after changes constitutes acceptance.',
        ],
      },
      {
        heading: '9. Contact',
        body: [
          'For questions about these Terms, contact the administrator of this Mintaz instance.',
        ],
      },
    ],
  },
  vi: {
    title: 'Điều khoản dịch vụ',
    updated: UPDATED_VI,
    intro:
      'Mintaz là phần mềm tự lưu trữ (self-hosted) để triển khai ứng dụng từ Git. Mỗi bản cài đặt do quản trị viên riêng vận hành ("Nhà vận hành"). Khi tạo tài khoản hoặc sử dụng phiên bản này, bạn ("Người dùng") đồng ý với các Điều khoản sau.',
    sections: [
      {
        heading: '1. Dịch vụ',
        body: [
          'Mintaz sao chép kho Git, build image Docker, chạy trong container cách ly và phục vụ qua subdomain phía sau reverse proxy và Cloudflare Tunnel.',
          'Vì Mintaz là self-hosted, Nhà vận hành của phiên bản này — không phải tác giả dự án Mintaz — chịu trách nhiệm về tính sẵn sàng, dữ liệu và hoạt động của nó.',
        ],
      },
      {
        heading: '2. Tài khoản',
        body: [
          'Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động dưới tài khoản của mình.',
          'Bạn phải cung cấp email hợp lệ. Tài khoản đầu tiên được tạo sẽ là quản trị viên.',
        ],
      },
      {
        heading: '3. Sử dụng hợp lệ',
        body: [
          'Bạn không được triển khai hoặc phát tán nội dung trái pháp luật, vi phạm bản quyền, độc hại (mã độc, lừa đảo), hoặc lạm dụng tài nguyên dùng chung (đào tiền mã hóa, tấn công từ chối dịch vụ, spam).',
          'Bạn không được tìm cách thoát khỏi container, truy cập dữ liệu của người dùng khác, hay vượt qua giới hạn tài nguyên/biện pháp bảo mật.',
          'Bạn hoàn toàn chịu trách nhiệm về mã nguồn mình triển khai và dữ liệu mà nó xử lý.',
        ],
      },
      {
        heading: '4. Giới hạn tài nguyên',
        body: [
          'Mỗi container chạy với giới hạn CPU, bộ nhớ và số tiến trình; tài khoản có thể bị áp hạn mức. Nhà vận hành có thể điều chỉnh các giới hạn này.',
        ],
      },
      {
        heading: '5. Dịch vụ bên thứ ba',
        body: [
          'Mintaz tích hợp với GitHub, Docker và Cloudflare. Việc bạn sử dụng các dịch vụ đó tuân theo điều khoản riêng của họ. Token bạn kết nối chỉ được dùng để thực hiện thao tác bạn yêu cầu (sao chép kho, quản lý DNS).',
        ],
      },
      {
        heading: '6. Tạm ngưng & chấm dứt',
        body: [
          'Nhà vận hành có thể tạm ngưng hoặc xóa tài khoản và bản triển khai vi phạm Điều khoản hoặc đe dọa sự ổn định/bảo mật của nền tảng.',
          'Bạn có thể ngừng sử dụng dịch vụ và yêu cầu xóa tài khoản bất kỳ lúc nào.',
        ],
      },
      {
        heading: '7. Miễn trừ & trách nhiệm',
        body: [
          'Phần mềm được cung cấp "nguyên trạng" (as is), không kèm bảo đảm, theo Giấy phép MIT. Trong phạm vi pháp luật cho phép, Nhà vận hành và tác giả Mintaz không chịu trách nhiệm cho bất kỳ thiệt hại nào phát sinh từ việc sử dụng dịch vụ.',
        ],
      },
      {
        heading: '8. Thay đổi',
        body: [
          'Điều khoản có thể được cập nhật theo thời gian. Việc tiếp tục sử dụng sau khi thay đổi đồng nghĩa với chấp nhận.',
        ],
      },
      {
        heading: '9. Liên hệ',
        body: [
          'Mọi thắc mắc về Điều khoản, vui lòng liên hệ quản trị viên của phiên bản Mintaz này.',
        ],
      },
    ],
  },
};

export const PRIVACY: Record<Lang, LegalDoc> = {
  en: {
    title: 'Privacy Policy',
    updated: UPDATED_EN,
    intro:
      'This policy explains what data Mintaz processes. Mintaz is self-hosted: all data lives on the server operated by this instance’s administrator ("the Operator"). The Mintaz project authors do not receive any of it.',
    sections: [
      {
        heading: '1. Account data',
        body: [
          'We store your email, optional display name, role, and a password hash (scrypt — your raw password is never stored).',
          'If you connect GitHub, we store your GitHub login and avatar.',
        ],
      },
      {
        heading: '2. Connected tokens',
        body: [
          'GitHub and Cloudflare access tokens you provide are stored encrypted at rest (AES-256-GCM) and used only to perform actions you request, such as cloning private repositories and managing DNS records.',
        ],
      },
      {
        heading: '3. Project & deployment data',
        body: [
          'We store the repositories, branches, environment variables, and build/runtime logs needed to deploy and operate your applications.',
        ],
      },
      {
        heading: '4. Analytics on deployed sites',
        body: [
          'For sites deployed through Mintaz, a lightweight tracker may record page views: the visited path, referrer, approximate country, and browser/device/OS (from the user agent).',
          'Visitor IP addresses are one-way hashed (not stored in raw form) and used only to count unique visitors. No cross-site tracking or advertising profiles are created.',
        ],
      },
      {
        heading: '5. Cookies & local storage',
        body: [
          'Your sign-in token (JWT) and preferences (theme, language) are kept in your browser’s local storage. They are essential for the dashboard to function and are not used for advertising.',
          'With your consent, we also set first-party cookies: "mintaz_consent" (records your choice) and "mintaz_vid" (a random analytics visitor id). The visitor id lets us measure dashboard usage — page views by country and device — and is hashed before storage. You can decline or withdraw this in the cookie banner; no third-party or advertising cookies are used.',
        ],
      },
      {
        heading: '6. How we protect data',
        body: [
          'Passwords are hashed with scrypt; tokens are encrypted at rest; access is authenticated with JWT and authorized per owner; login is rate-limited; deployments run in isolated, resource-capped containers.',
        ],
      },
      {
        heading: '7. Sharing',
        body: [
          'We do not sell your data. Data is shared only with the third-party services you explicitly connect (GitHub, Cloudflare) to provide the service, or where required by law.',
        ],
      },
      {
        heading: '8. Retention & your rights',
        body: [
          'Data is kept while your account and projects exist. You may update your profile, delete projects, or request account deletion, which removes your associated data from this instance.',
        ],
      },
      {
        heading: '9. Contact',
        body: [
          'For privacy questions or data requests, contact the administrator of this Mintaz instance.',
        ],
      },
    ],
  },
  vi: {
    title: 'Chính sách bảo mật',
    updated: UPDATED_VI,
    intro:
      'Chính sách này giải thích Mintaz xử lý dữ liệu gì. Mintaz là self-hosted: toàn bộ dữ liệu nằm trên máy chủ do quản trị viên của phiên bản này ("Nhà vận hành") vận hành. Tác giả dự án Mintaz không nhận được bất kỳ dữ liệu nào.',
    sections: [
      {
        heading: '1. Dữ liệu tài khoản',
        body: [
          'Chúng tôi lưu email, tên hiển thị (tùy chọn), vai trò và mã băm mật khẩu (scrypt — không bao giờ lưu mật khẩu gốc).',
          'Nếu bạn kết nối GitHub, chúng tôi lưu tên đăng nhập GitHub và ảnh đại diện.',
        ],
      },
      {
        heading: '2. Token đã kết nối',
        body: [
          'Token GitHub và Cloudflare bạn cung cấp được mã hóa khi lưu trữ (AES-256-GCM) và chỉ dùng để thực hiện thao tác bạn yêu cầu, như sao chép kho riêng tư và quản lý bản ghi DNS.',
        ],
      },
      {
        heading: '3. Dữ liệu dự án & triển khai',
        body: [
          'Chúng tôi lưu kho mã, nhánh, biến môi trường và log build/runtime cần thiết để triển khai và vận hành ứng dụng của bạn.',
        ],
      },
      {
        heading: '4. Phân tích trên trang đã triển khai',
        body: [
          'Với các trang triển khai qua Mintaz, một trình theo dõi nhẹ có thể ghi lượt xem trang: đường dẫn, nguồn giới thiệu (referrer), quốc gia gần đúng và trình duyệt/thiết bị/hệ điều hành (từ user agent).',
          'Địa chỉ IP của khách được băm một chiều (không lưu dạng gốc) và chỉ dùng để đếm khách duy nhất. Không tạo hồ sơ quảng cáo hay theo dõi xuyên trang.',
        ],
      },
      {
        heading: '5. Cookie & lưu trữ cục bộ',
        body: [
          'Token đăng nhập (JWT) và tùy chọn (giao diện, ngôn ngữ) được lưu trong local storage của trình duyệt. Chúng thiết yếu để bảng điều khiển hoạt động và không dùng cho quảng cáo.',
          'Khi bạn đồng ý, chúng tôi cũng đặt cookie first-party: "mintaz_consent" (lưu lựa chọn của bạn) và "mintaz_vid" (id phân tích ngẫu nhiên). Id này giúp đo lượng truy cập dashboard — lượt xem theo quốc gia và thiết bị — và được băm trước khi lưu. Bạn có thể từ chối hoặc rút lại trong banner cookie; không có cookie của bên thứ ba hay quảng cáo.',
        ],
      },
      {
        heading: '6. Cách chúng tôi bảo vệ dữ liệu',
        body: [
          'Mật khẩu băm bằng scrypt; token mã hóa khi lưu; truy cập xác thực bằng JWT và phân quyền theo chủ sở hữu; đăng nhập có giới hạn tần suất; bản triển khai chạy trong container cách ly, giới hạn tài nguyên.',
        ],
      },
      {
        heading: '7. Chia sẻ',
        body: [
          'Chúng tôi không bán dữ liệu của bạn. Dữ liệu chỉ được chia sẻ với dịch vụ bên thứ ba bạn chủ động kết nối (GitHub, Cloudflare) để cung cấp dịch vụ, hoặc khi pháp luật yêu cầu.',
        ],
      },
      {
        heading: '8. Lưu trữ & quyền của bạn',
        body: [
          'Dữ liệu được giữ trong khi tài khoản và dự án của bạn còn tồn tại. Bạn có thể cập nhật hồ sơ, xóa dự án hoặc yêu cầu xóa tài khoản, khi đó dữ liệu liên quan sẽ bị xóa khỏi phiên bản này.',
        ],
      },
      {
        heading: '9. Liên hệ',
        body: [
          'Mọi thắc mắc về quyền riêng tư hoặc yêu cầu dữ liệu, vui lòng liên hệ quản trị viên của phiên bản Mintaz này.',
        ],
      },
    ],
  },
};
