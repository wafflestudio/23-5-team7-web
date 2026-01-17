import { useEffect } from 'react';
import { getMe } from '../api/auth';
import type { User } from '../types';

interface Props {
  onLoginSuccess: (user: User) => void;
  onNeedSocialSignup: (data: {
    email: string;
    social_id: string;
    social_type: 'GOOGLE';
  }) => void;
  onNeedVerify: () => void;
}

export default function GoogleCallback({
  onLoginSuccess,
  onNeedSocialSignup,
  onNeedVerify,
}: Props) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const needsSignup = params.get('needs_signup');
    const error = params.get('error');

    /* 실패 */
    if (error) {
      alert(params.get('message') ?? '소셜 로그인 실패');
      window.history.replaceState({}, '', '/');
      return;
    }

    /* 기존 유저 → 이미 로그인 상태 */
    if (needsSignup === 'false') {
      getMe()
        .then((res) => {
          const user = res.data as User;
          // @ts-ignore: Assuming User type has is_snu_verified based on API spec
          if (user.is_snu_verified === false) {
            onNeedVerify();
          } else {
            onLoginSuccess(user);
          }
        })
        .finally(() => {
          window.history.replaceState({}, '', '/');
        });
      return;
    }

    /* 신규 유저 */
    if (needsSignup === 'true') {
      onNeedSocialSignup({
        email: params.get('email')!,
        social_id: params.get('social_id')!,
        social_type: 'GOOGLE',
      });
      window.history.replaceState({}, '', '/');
    }
  }, [onLoginSuccess, onNeedSocialSignup, onNeedVerify]);

  return null;
}
