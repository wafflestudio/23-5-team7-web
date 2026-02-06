# overview
- react와 vite를 활용한 프론트엔드 개발
- 프로젝트 주제: 토토 사이트
- 주요 기능: 회원가입, 로그인, 배팅, 결과 확인

# API 구현

## 1. 회원가입/로그인

### 1-1) POST `/api/users` — 회원가입(일반/소셜 공통)

사용자의 가입 요청을 받아 검증 후 저장합니다.

**스누메일 인증 관련 로직**

- 초기 가입 시 `is_snu_verified` 는 False로 설정됩니다(소셜로그인의 경우에는 자동으로 True로 설정)
- `is_snu_verified`가 `False`로 설정된 사용자는 로그인을 할 수 없습니다.
- 회원가입 직후 스누메일 인증 로직으로 이동합니다. (회원가입 성공 응답으로 받은 `verification_token` 사용)
- 만약 회원가입 직후 인증을 받지 못하면 로그인이 거부되며, 이때 다시 스누메일을 인증할 수 있습니다.
- **이메일 도용 가입 방지**: 만약 회원가입 직후로부터 스누메일을 인증받지 않은 상태로 약 15분이 지나면, `verification_token` 이 만료되며, 20분이 지나면 DB에서 해당 유저의 정보가 삭제됩니다. 따라서 해당 이메일로 서비스를 이용하기 위해서 회원가입을 처음부터 진행해야합니다.

> 참고: 사용자가 이메일 인증을 받을 수 있는 방법은 2가지가 있습니다.
1. 회원가입 직후 자동으로 스누메일 인증 창으로 이동했을 때.
2. (`1`에서 인증을 하지 않고 나간 경우) 로그인을 시도했지만 스누메일 인증 로직으로 이동했을 때.
> 

**검증 및 처리 규칙:**

- **email**: 필수 필드이며 이메일 형식이어야 합니다. `@snu.ac.kr` 도메인만 허용하며, 기존 유저와 중복될 수 없습니다.
- **password**: 일반 가입(`social_type="LOCAL"`) 시 필수입니다. **8자 이상 20자 이하**여야 하며 **Argon2**로 해싱 저장합니다.
- **nickname**: 필수 필드이며 **2자 이상 20자 이하**여야 합니다. 기존 유저와 중복될 수 없습니다.
- **social_type**: "LOCAL", "GOOGLE", "KAKAO" 중 하나여야 합니다. (기본값 "LOCAL")
- **social_id**: 소셜 가입 시 필수이며, 해당 타입 내에서 고유해야 합니다. (null 로 값을 요청 받으면 ERR_017을 호출)
- **요청**
    
    ```json
    {
        "email": "waffle@snu.ac.kr",
        "password": "password1234",
        "nickname": "토토왕",
        "social_type": "LOCAL",
    	  "social_id": null
    }
    ```
    
- **성공 응답 (201 Created)**
    
    ```json
    {
        "user_id": "uuid...",
        "email": "waffle@snu.ac.kr",
        "points": 10000,
        "role": "USER",
        "is_snu_verified": false,
    	  "is_verified": false,
    	  "social_type": "LOCAL",
    	  "created_at": "2026-01-09T01:20:00Z",
    	  "verification_token": "..."
    }
    
    ```
    
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 400 | `ERR_001` | MISSING REQUIRED FIELDS | 필수 요청 필드가 누락됨 |
    | 400 | `ERR_002` | INVALID FIELD FORMAT | 필드 형식이 올바르지 않음 (이메일 형식 등) |
    | 409 | `ERR_006` | EMAIL ALREADY EXISTS | 회원가입 시 이미 존재하는 이메일 |
    | 409 | `ERR_007` | NICKNAME ALREADY EXISTS | 회원가입 시 이미 존재하는 닉네임 |
    | 403 | `ERR_010` | ONLY SNU EMAIL ALLOWED | 이메일이 @snu.ac.kr 도메인이 아닌 경우 |
    | 400 | `ERR_016` | PASSWORD IS REQUIRED FOR LOCAL SIGNUP | 로컬 회원가입에서 password가 누락됨 |
    | 400 | `ERR_017` | SOCIAL ID IS REQUIRED FOR SOCIAL SIGNUP | 소셜 회원가입에서 소셜 ID가 누락됨 |
    | 409 | `ERR_018` | SOCIAL ID ALREADY EXISTS | 이미 가입된 소셜 ID |
    | 409 | `ERR_051` | WITHDRAWAL COOLDOWN PERIOD | 30일 이내 재가입을 시도하는 경우 |

### 1-2) GET `/api/auth/google/login` — 소셜 로그인 시작

사용자를 구글 OAuth2 인증 페이지로 리다이렉트시킵니다.

### 1-3) GET `/api/auth/google/callback` — 소셜 로그인 콜백

구글 인증 성공 후 전달받은 `code`를 사용하여 유저 정보를 획득하고 로그인 또는 회원가입 절차를 진행합니다. 이 엔드포인트는 JSON을 반환하는 대신 **프론트엔드 특정 URL로 브라우저를 리다이렉트**시킵니다.

**검증 및 처리 규칙:**

1. **인가 코드 검증:** 구글 서버로부터 유효한 유저 정보를 가져옵니다.
2. **이메일 도메인 체크:** `@snu.ac.kr` 도메인이 아닌 경우 실패 리다이렉트를 수행합니다.
3. **데이터 전달 방식:**
    - **토큰 (Access/Refresh):** 보안을 위해 브라우저의 **HttpOnly 쿠키**에 저장됩니다.
    - **상태 정보:** 회원가입 필요 여부 및 메시지는 프론트엔드 주소의 **쿼리 파라미터**로 전달됩니다.

- **기존 유저 판별**: `social_id`가 DB에 존재하면 즉시 로그인을 처리(JWT 발급)합니다.
- **신규 유저 판별**: `social_id`가 DB에 없으면 회원가입을 위해 구글에서 획득한 정보를 반환하며, 프론트엔드에서 닉네임 설정 페이지로 유도합니다. 이후 POST `/api/users` 를 통해 가입을 회원가입을 완료합니다.

- **요청**
    - `code` : 구글 인증 서버에서 발급한 인가 코드
- **성공 시 응답 (302 Found - 리다이렉트)**
    
    브라우저는 다음 주소로 자동 이동합니다:
    
    `https://d55bqrug1d7zs.cloudfront.net/?needs_signup=...&message=...`
    
- **성공 상황 1: 기존 유저 (로그인 성공)**
    - **Redirect URL:** `https://d55bqrug1d7zs.cloudfront.net/?needs_signup=false&message=로그인+성공`
    - **Set-Cookie (브라우저 저장):**
        - `access_token`: JWT (HttpOnly, Secure, 15분)
        - `refresh_token`: JWT (HttpOnly, Secure, 24시간)
- **성공 상황 2: 신규 유저 (회원가입 필요)**
    - **Redirect URL:** `https://d55bqrug1d7zs.cloudfront.net/?needs_signup=true&message=신규+유저입니다&email=...&social_id=...&social_type=GOOGLE`
    - **특이사항:** 토큰 쿠키는 생성되지 않으며, 프론트엔드는 쿼리 파라미터의 정보를 사용하여 닉네임 설정 페이지로 유도합니다.
- **실패 시 리다이렉트 (302 Found)**
에러 발생 시 프론트엔드 로그인 페이지로 리다이렉트하며, 쿼리 파라미터로 에러 정보를 전달합니다.
    - **예시:** [`https://d55bqrug1d7zs.cloudfront.net/login?error=ERR_010&message=ONLY_SNU_EMAIL_ALLOWED`](https://d55bqrug1d7zs.cloudfront.net/login?error=ERR_010&message=ONLY%20SNU%20EMAIL%20ALLOWED)
        
        
        | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
        | --- | --- | --- | --- |
        | 409 | `ERR_006` | EMAIL ALREADY EXISTS | 회원가입 시 이미 존재하는 이메일 |
        | 403 | `ERR_010` | ONLY SNU EMAIL ALLOWED | 이메일이 @snu.ac.kr 도메인이 아닌 경우 |
        | 400 | `ERR_019` | GOOGLE AUTH FAILED | 구글 서버와의 통신 중 오류 발생 (인가 코드 만료 등) |
        | 400 | `ERR_020` | INVALID CALLBACK REQUEST | 필수 쿼리 파라미터(code)가 누락된 경우 |

### 1-4) POST `/api/auth/verify-email/send` — 인증번호 발송

가입한 이메일로 6자리 인증 코드를 발송합니다.

- **요청**
    - **헤더**: `Authorization: Bearer <Verification_Token>` (로그인 시 발급된 임시 토큰)
- **응답 (200 OK)**
    
    ```json
    {
      "message": "인증번호가 가입하신 이메일로 전송되었습니다."
    }
    ```
    
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 400 | `ERR_003` | BAD AUTHORIZATION HEADER | Authorization 헤더 형식이 잘못됨 |
    | 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
    | 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 |
    | 400 | `ERR_011` | EMAIL ALREADY VERIFIED | 이미 인증이 완료된 이메일 |
    | 500 | `ERR_013` | FAILED TO SEND EMAIL | 인증 메일 전송 실패 |
    | 429 | `ERR_021` | TOO MANY REQUESTS | 인증 메일 재발송 간격(1분) 미달 |

### 1-5) POST `/api/auth/verify-email/confirm` — 인증 코드 확인

사용자가 입력한 코드를 검증하고 `is_snu_verified`를 `True`로 변경합니다.

- **요청**
    - **헤더**: `Authorization: Bearer <Verification_Token>` (로그인 시 발급된 임시 토큰)
    
    ```json
    {
      "code": "123456"
    }
    ```
    
- **응답 (200 OK)**
    
    ```json
    {
    	"email": "student@snu.ac.kr",
      "is_snu_verified": true,
      "message": "이메일 인증이 완료되었습니다. 다시 로그인해주세요."
    }
    ```
    
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 400 | `ERR_003` | BAD AUTHORIZATION HEADER | Authorization 헤더 형식이 잘못됨 |
    | 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
    | 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 |
    | 400 | `ERR_012` | INVALID VERIFICATION CODE | 이메일 인증 코드가 틀린 경우, 이메일 인증 시간이 초과된 경우 (5분 경과) |

### 1-6) POST `/api/auth/login` — 로그인

- **일반 로그인**: `email`과 `password`를 대조하여 검증합니다.

- **요청**
    
    ```jsx
    {
      "email": "waffle@snu.ac.kr",
      "password": "password1234"
    }
    ```
    
- **성공 응답 (200 OK)**
    
    ```json
    {
        "access_token": "...",
        "refresh_token": "...",
        "user": { 
    	    "user_id": "...",
    	    "nickname": "토토왕",
    			"is_snu_verified": true,
    			"points": 10000
    		}
    }
    ```
    
- **응답(이메일 인증 필요)**
- 임시 토큰(`verification_token`) 포함
    
    ```json
    {
        "error_code": "ERR_015",
        "error_msg": "EMAIL VERIFICATION REQUIRED",
        "verification_token": "..." 
    }
    ```
    
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 400 | `ERR_001` | MISSING REQUIRED FIELDS | 필수 요청 필드가 누락됨 |
    | 401 | `ERR_014` | INVALID CREDENTIALS | 이메일이 없거나 비밀번호가 틀린 경우 (보안상 통합) |
    | 403 | `ERR_015` | EMAIL VERIFICATION REQUIRED | 계정은 있으나 아직 SNU 메일 인증을 안 한 사용자가 로그인 시도 |

### 1-7) POST `/api/auth/refresh` — 새로운 액세스 토큰 발급

만료된 `access_token`을 대신하여, 브라우저에 저장된 `refresh_token`을 사용해 새로운 토큰 쌍을 발급받고 유저 정보를 동기화합니다.

- **요청**
    - **헤더**: `Cookie`: `refresh_token=<Refresh_Token>` (필수)
- **성공 응답 (200 OK)**
    
    **Set-Cookie Header**
    
    - `access_token=...; HttpOnly; Secure; SameSite=None; Max-Age=900`
    - `refresh_token=...; HttpOnly; Secure; SameSite=None; Max-Age=86400`
    
    ```json
    {
        "access_token": "...",
        "refresh_token": "...",
        "user": { 
    	    "user_id": "...",
    	    "nickname": "토토왕",
    			"is_snu_verified": true,
    			"points": 10000
    		}
    }
    ```
    
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
    | 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 |
    | 403 | `ERR_046` | USER SUSPENDED | 정지된 유저가 로그인 또는 로그인이 필요한 서비스를 사용하려는 경우 |

### 1-8) POST `/api/auth/logout` — 로그아웃 (로그인 필요)

현재 사용 중인 Access Token과 Refresh Token을 서버 측 블랙리스트(Redis)에 등록하여 즉시 무효화하고, 브라우저에 저장된 인증 쿠키를 삭제합니다.

- **요청**
    - **헤더**
        - `Authorization`: `Bearer <Access_Token>` (필수 - 해당 토큰을 블랙리스트에 등록하기 위함)
        - `Cookie`: `refresh_token=<Refresh_Token>` (필수 - 리프레시 토큰 무효화 및 삭제용)
- **성공 응답 (200 OK)**
    
    ```json
    {
        "message": "성공적으로 로그아웃 되었습니다."
    }
    ```
    
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
    | 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 |
    | 403 | `ERR_046` | USER SUSPENDED | 정지된 유저가 로그인 또는 로그인이 필요한 서비스를 사용하려는 경우 |

### 1-9) POST `/api/auth/withdraw` — 회원 탈퇴 (로그인 필요)

현재 로그인한 유저의 계정을 삭제(비식별화) 처리하고, 모든 인증 세션을 종료합니다. 기존의 베팅 내역 및 이벤트 기록은 유지되지만 개인정보는 모두 파기됩니다.

- **요청**
    - **헤더**
        - `Authorization`: `Bearer <Access_Token>` (필수)
        - `Cookie`: `refresh_token=<Refresh_Token>` (필수)
- **성공 응답 (200 OK)**
    
    ```json
    {
        "message": "회원 탈퇴가 완료되었습니다. 30일 이내에는 동일한 이메일로 재가입이 불가능합니다."
    }
    ```
    
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
    | 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 |

### **공통 참고사항**

- 로그인이 필요한 API는 헤더에 `Authorization: Bearer <Access_Token>`이 포함됩니다.
- 로그인 및 로그인이 필요한 모든 API에서, 정지된 유저가 접근하는 경우 다음 응답이 반환됩니다.
(소셜로그인의 경우, 쿼리 파라미터에 관련 정보가 제공됩니다.)
    
    ```json
    {
        "error_code": "ERR_046",
        "error_msg": "USER SUSPENDED",
        "detail": {
            "suspension_reason": "부적절한 닉네임 사용",
            "suspended_until": "2026-01-24T15:00:00"
        }
    }
    ```
    

---

## 2. 이벤트 생성/관리/조회

### 2-1) POST `/api/events` — 이벤트 생성 (로그인 필요)

사용자가 **새로운 이벤트**를 생성하며, **옵션 리스트**를 함께 정의합니다.

**검증 및 처리 규칙:**

- **title**: 필수 필드이며 **5자 이상 100자 이하**여야 합니다.
- **description**: 선택 필드이며 이벤트에 대한 상세 설명을 텍스트로 입력합니다.
- **start_at**: 필수 필드이며 현재 시각 또는 현재 시각보다 미래의 시각이어야 합니다.
- **end_at**: 필수 필드이며 현재 시각/시작 시각보다 미래의 시각이어야 합니다.
- **options**: 필수 필드이며 **2개 이상 10개 이하**의 선택지 객체를 포함해야 합니다.
    - **options[].name**: 필수이며 **1자 이상 50자 이하**여야 합니다. 한 이벤트 내에서 다른 옵션과 이름이 중복될 수 없습니다.
    - **options[].option_image_index** 필수이며 옵션에 대한 **이미지가 존재하지 않으면 -1**, 존재하면 **image_files의 0 이상의 정수 인덱스**이어야 합니다.
- **images**: 선택 필드이며 이미지 객체 리스트를 포함할 수 있습니다.
    - **images[].image_index** : 필수이며 이벤트에 대한 이미지를 **image_files의 0 이상의 정수 인덱스**로 나타냅니다.
    
- **요청**
    - **헤더**: `Content-Type: multipart/form-data`
    - **Body(Form Data) -** 이미지 파일들과 JSON 데이터
        
        
        | **Key** | **Type** | **Value** |
        | --- | --- | --- |
        | data | `string (JSON)` | 아래의 JSON 문자열 (파일 인덱스 포함) |
        | image_files | `file[]` | 이미지 파일들 또는 빈 리스트 (이벤트 이미지, 옵션 이미지가 하나의 리스트를 공유) |
        
        | **이미지 허용 확장자** | **MIME Type** | **장점** |
        | --- | --- | --- |
        | .jpg / .jpeg | image/jpeg | 용량이 작고 호환성이 가장 좋음 |
        | .png | image/png | 손실 없는 고화질, 투명도 지원 |
        | .webp | image/webp | JPG/PNG보다 용량이 훨씬 작음 |
        
        개별 이미지 용량 제한: 5MB
        
        ```json
        {
            "title": "공대 vs 자연대 축구",
            "description": "관악의 주인 결정전",
            "start_at": "2026-05-11T12:00:00",
            "end_at": "2026-05-20T18:00:00",
            "options": [
                { "name": "공대 승", "option_image_index": 1 },
                { "name": "자연대 승", "option_image_index": 2 },
                { "name": "무승부", "option_image_index": -1 }
            ],
            "images": [
                { "image_index": 0 }, 
                { "image_index": 1 }
            ]
        }
        ```
        
- **응답 (201 Created)**
옵션의 `order`는 요청 JSON의 `options` 배열 순서(Index)를 기반으로 서버에서 자동 부여함.
    
    ```json
    {
        "event_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "creator_id": "7ca32b1a-1234-4567-8901-abcdef123456",
        "title": "공대 vs 자연대 축구",
        "description": "관악의 주인 결정전",
        "status": "READY",
        "created_at": "2026-01-11T03:52:00Z",
        "start_at": "2026-05-11T12:00:00Z",
        "end_at": "2026-05-20T18:00:00Z",
        "options": [
            {
                "option_id": "opt-9876-5432-10",
                "name": "공대 승",
                "order": 0,
                "participant_count": 0,
                "option_total_amount": 0,
                "is_winner": null
            },
            ...
        ]
    }
    ```
    
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 400 | `ERR_001` | MISSING REQUIRED FIELDS | 필수 요청 필드가 누락됨 |
    | 400 | `ERR_002` | INVALID FIELD FORMAT | 필드 형식이 올바르지 않음 (이메일 형식 등) |
    | 400 | `ERR_003` | BAD AUTHORIZATION HEADER | Authorization 헤더 형식이 잘못됨 |
    | 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
    | 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 |
    | 400 | `ERR_023` | INVALID DATE | 종료시각, 시작시각, 현재시각의 순서가 맞지 않을 때 |
    | 400 | `ERR_024` | INSUFFICIENT/TOO MANY OPTIONS | 옵션의 개수가 2개 미만 또는 10개 초과일 때 |
    | 400 | `ERR_025` | INVALID OPTION NAME | 공백으로만 이루어진 옵션 이름 |
    | 413 | `ERR_026` | IMAGE TOO LARGE | 이미지 용량 제한을 초과 |
    | 500 | `ERR_027` | FAILED TO UPLOAD IMAGE | 서버 내부 문제로 이미지를 S3에 업로드 실패한 경우 |
    | 409 | `ERR_028` | DUPLICATE OPTION NAME | 한 이벤트 내에 동일한 이름의 옵션이 존재할 때 |
    | 415 | `ERR_033` | INVALID CONTENT TYPE | `Content-Type`이 `multipart/form-data`가 아닌 경우 |
    | 400 | `ERR_034` | IMAGE INDEX OUT OF BOUNDS | 인덱스의 범위가 잘못됨 |
    | 415 | `ERR_035` | INVALID IMAGE FORMAT | 업로드된 파일이 이미지가 아니거나 허용된 확장자가 아닐 때 |

### 2-2) PATCH `/api/events/{event_id}/status` — 상태 변경 (로그인 필요)

URL 파라미터로 `event_id`가 들어오며, 이벤트의 상태를 `"READY"`, `"OPEN"`, `"CLOSED"`, `"CANCELLED"` 중 하나로 변경합니다.

**READY → OPEN, OPEN → CLOSED는 기본적으로 이벤트 생성 시 정한 `start_at`, `end_at`에 따라 자동으로 상태가 변경됩니다. 필요한 경우, 관리자가 수동으로 상태를 변경할 수 있습니다.**

**상태 전이 제한**: 이벤트 상태는 정해진 순서로만 변경 가능합니다.

- **READY → OPEN**: 사용자가 베팅할 수 있는 상태로 전환합니다.
- **OPEN → CLOSED**: 베팅을 마감합니다. 더 이상 베팅이 불가능하며 결과 입력을 기다리는 상태입니다.
- **ANY → CANCELLED**: 이벤트에 문제가 생겨 무효화하는 경우를 처리합니다.

**권한 검증**: 요청자에게 관리자 권한이 있어야 합니다. 

- **요청**
    
    ```json
    { 
        "status": "CLOSED"
    }
    ```
    
- **응답 (200 OK)**
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 400 | `ERR_001` | MISSING REQUIRED FIELDS | 필수 요청 필드가 누락됨 |
    | 400 | `ERR_002` | INVALID FIELD FORMAT | 필드 형식이 올바르지 않음 (이메일 형식 등) |
    | 400 | `ERR_003` | BAD AUTHORIZATION HEADER | Authorization 헤더 형식이 잘못됨 |
    | 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
    | 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 |
    | 404 | `ERR_009` | EVENT NOT FOUND | 이벤트를 찾을 수 없는 경우 |
    | 400 | `ERR_029` | INVALID STATUS TRANSITION | 잘못된 상태 전이 |
    | 403 | `ERR_030` | NOT ADMIN | 관리자가 아닌 유저가 요청 |

### 2-3) POST `/api/events/{event_id}/settle` — 결과 정산 (로그인 필요)

상태가 `"CLOSED"`인 이벤트에 대해 승리한 옵션의 ID를 지정하여 포인트를 정산합니다. 해당 이벤트는 `"SETTLED"` 상태가 됩니다.

(정산 시 소수점은 버림)

**권한 검증**: 요청자에게 관리자 권한이 있어야 합니다.

- **요청**
    
    ```json
    {
        "winner_option_ids": ["opt-1-uuid...", ... ]
    }
    ```
    
- **응답 (200 OK)**
    
    ```json
    {
        "event_id": "...",
        "status": "SETTLED",
        "winner": [ {"option_id": "opt-1...", "name": "공대 승" }, ... ],
    }
    ```
    
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 400 | `ERR_001` | MISSING REQUIRED FIELDS | 필수 요청 필드가 누락됨 |
    | 400 | `ERR_002` | INVALID FIELD FORMAT | 필드 형식이 올바르지 않음 (이메일 형식 등) |
    | 400 | `ERR_003` | BAD AUTHORIZATION HEADER | Authorization 헤더 형식이 잘못됨 |
    | 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
    | 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 |
    | 404 | `ERR_009` | EVENT NOT FOUND | 이벤트를 찾을 수 없는 경우 |
    | 403 | `ERR_030` | NOT ADMIN | 관리자가 아닌 유저가 요청 |
    | 400 | `ERR_031` | INVALID WINNER OPTION | 승리 옵션 ID가 해당 이벤트의 옵션 목록에 없는 경우 |
    | 400 | `ERR_032` | NOT CLOSED | CLOSED가 아닌 이벤트에 대해 정산하려고 하는 경우 |

### 2-4-1) GET `/api/events/{event_id}` — 이벤트 상세 조회

특정 이벤트의 상세 정보와 해당 이벤트에 포함된 모든 선택지(Options) 및 이미지 정보를 조회.

**기능 설명**

- 이벤트 ID를 경로 파라미터로 받아 해당 데이터가 존재하는지 확인.
- 응답에는 각 옵션별 `total_bet_amount`(총 배팅 금액)가 포함되어 실시간 배팅 현황을 보여줌.

- **요청 (Request)**
- **Method:** `GET`
- **URL:** `/api/events/{event_id}`

- **응답 (Response)**
    - **추가된 내용:**  로그인 시 `is_liked` 포함, 비로그인 시 `null`
        
        **추가 필드:**
        
        - `like_count` (Integer): 이벤트의 총 좋아요 수 (실시간 COUNT 쿼리)
        - `is_liked` (Boolean | null): 현재 로그인한 사용자의 좋아요 여부
            - `true`: 좋아요를 누른 상태
            - `false`: 좋아요를 누르지 않은 상태
            - `null`: 비로그인 상태
- **상태 코드:** `200 OK`
    
    ```json
    {
      "event_id": "7f1c5139-8e80-4d25-b123-446655440000",
      "title": "2026 월드컵 결승전 승자",
      "description": "결승전 승자를 예측하세요",
      "status": "OPEN",
      "total_participants": 50,
      "created_at": "2026-01-11T03:52:00",
      "start_at": "2026-01-13T12:00:00",
      "end_at": "2026-01-15T18:00:00",
      "like_count": 42,
      "is_liked": true,
      "is_eligible": true,
      "options": [
        {
          "option_id": "opt-001",
          "name": "브라질",
          "option_total_amount": 15000000,
          "participant_count": 40,
          "odds": 1.2,
          "is_winner": null,
          "option_image_url": null
        },
        ...
      ],
      "images": [
        { "image_url": "https://..." }
      ]
    }
    ```
    
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 404 | `ERR_009` | `EVENT NOT FOUND` | **이벤트를 찾을 수 없는 경우** |

### 2-4-2 )`/api/events/ws/{event_id}` —WebSocket API 실시간 배당률 업데이트 구독

특정 이벤트의 배당률 변경사항을 실시간으로 수신합니다.

**기능 설명**

- WebSocket 연결을 통해 이벤트의 배당률 변경을 실시간으로 수신
- 연결 즉시 초기 배당률 데이터를 전송
- 베팅이 발생하여 배당률이 변경될 때마다 자동으로 업데이트 메시지 전송
- 페이지를 떠나거나 연결을 끊을 때까지 지속적으로 연결 유지

**요청**

- **Protocol:** WebSocket
- wss://server.snutoto.o-r.kr/api/events/{event_id}
- **경로 파라미터:**
    - event_id (string, required): 구독할 이벤트의 고유 식별자

**응답**

- **1. 초기 배당률 데이터 (연결 직후)**

```json
{
  "type": "initial",
  "event_id": "7f1c5139-8e80-4d25-b123-446655440000",
  "options": [
    {
      "option_id": "opt-001",
      "name": "브라질",
      "odds": 1.2
    },
    {
      "option_id": "opt-002",
      "name": "아르헨티나",
      "odds": 2.5
    }
  ]
}
```

- **배당률 업데이트 (베팅 발생 시)**

```json
{
  "type": "odds_update",
  "event_id": "7f1c5139-8e80-4d25-b123-446655440000",
  "options": [
    {
      "option_id": "opt-001",
      "odds": 1.15
    },
    {
      "option_id": "opt-002",
      "odds": 2.8
    }
  ]
}
```

- **에러 상황 (WebSocket은 HTTP와 다른 프로토콜이므로 에러코드 분리)**

| **상황** | **종료 코드** | **종료 이유 (reason)** | **관련 ERROR_CODE** |
| --- | --- | --- | --- |
| 존재하지 않는 event_id | `1008` | `EVENT NOT FOUND` | `ERR_009` |
| 서버 내부 오류 | `1011` | Internal server error | - |
| 네트워크 연결 끊김 | `1006` | - | - |
- ***WebSocket 종료 코드**
    
    WebSocket 연결이 종료될 때 다음과 같은 종료 코드를 받습니다:
    
    | **종료 코드** | **상황** |
    | --- | --- |
    | `1000` | 정상 종료 (클라이언트가 ws.close() 호출) |
    | `1001` | 페이지 이동, 브라우저 닫기 |
    | `1006` | 비정상 종료 (네트워크 오류 등) |
    | `1008` | 정책 위반 (존재하지 않는 event_id) |
    | `1011` | 서버 내부 오류 |

### 2-5) GET `/api/events` — 이벤트 목록 조회

전체 이벤트 목록을 커서 기반 페이지네이션으로 조회. `status, liked` 쿼리 파라미터를 통해 특정 상태 또는 좋아요한 이벤트만 필터링

마감 임박순(`end_at` 오름차순)으로 정렬된 결과를 반환

> [페이지네이션 참고]
> 
> - 첫 페이지 조회 시 `cursor` 파라미터를 비우고 요청합니다.
> - 이후 응답에 포함된 `next_cursor` 값이 존재하면, 해당 값을 다음 요청의 `cursor` 파라미터로 그대로 전달하여 다음 페이지를 조회합니다.
> - `next_cursor`가 `null`이거나 `has_more`가 `false`이면 더 이상 데이터가 없음을 의미합니다.

- **요청 (Request)**
- **Method:** `GET`
- **URL:** `/api/events`
- 쿼리 파라미터 사용:
    
    
    | 파라미터 | 타입 | 필수 | 설명 | 기본값 | 제약사항 |
    | --- | --- | --- | --- | --- | --- |
    | `status` | string | ❌ | 이벤트 상태 필터 | - | `OPEN`, `CLOSED`, `SETTLED` 중 하나 |
    | `liked` | boolean | ❌ | 좋아요한 이벤트만 필터링 | - | `true` of `false` |
    | `cursor` | string | ❌ | 페이지네이션 커서 (UUID)
     | - | 이전 응답의 `next_cursor` 값
    **Base64 encoded (end_at + event_id)** |
    | `limit` | integer | ❌ | 한 번에 가져올 개수 | 10 | 1 이상 100 이하 |
- **프론트엔드 참고:** 커서 값은 서버가 응답한 `next_cursor`를 그대로 복사해서 사용하세요. 내부 구조를 직접 파싱할 필요는 없습니다.
- 요청 예시

```json
# 첫 페이지 조회 (전체)
GET /api/events

# 첫 페이지 조회 (OPEN 상태만, 10개씩)
GET /api/events?status=OPEN&limit=10

# 다음 페이지 조회 (이전 응답의 next_cursor 사용)
GET /api/events?status=OPEN&cursor=MjAyNi0wMS0xNVQxODowMDowMHw3ZjFjNTEzOS04ZTgwLTRkMjUtYjEyMy00NDY2NTU0NDAwMDA=&limit=10

# CLOSED 상태 이벤트 조회
GET /api/events?status=CLOSED&limit=20

# 내가 좋아요한 이벤트만 조회 (로그인 필수)
GET /api/events?liked=true&limit=20

# 좋아요한 OPEN 상태 이벤트만 조회
GET /api/events?status=OPEN&liked=true&limit=10
```

- **성공 응답**
    - **추가된 내용:**  로그인 시 `is_liked` 포함, 비로그인 시 `null`
        
        **추가 필드:**
        
        - `like_count` (Integer): 이벤트의 총 좋아요 수 (실시간 COUNT 쿼리)
        - `is_liked` (Boolean | null): 현재 로그인한 사용자의 좋아요 여부
            - `true`: 좋아요를 누른 상태
            - `false`: 좋아요를 누르지 않은 상태
            - `null`: 비로그인 상태
    - 응답 필드 설명
    
    | 필드 | 타입 | 설명 |
    | --- | --- | --- |
    | **`next_cursor`** | string (Base64) | null | 다음 페이지 조회를 위한 커서 (더 이상 데이터가 없으면 `null`) |
    | **`has_more`** | boolean | 다음 페이지 존재 여부 |
    - **상태 코드:** `200 OK`
    - **본문:** 이벤트 객체 배열
        
        ```json
        {
        	"events": [
        	  {
        	    "event_id": "7f1c5139-8e80-4d25-b123-446655440000",
        	    "title": "2026 LCK 스프링 결승전 승리팀은?",
        	    "description": "승리 할 것 같은 팀을 고르세요",
        	    "status": "OPEN",
        	    "total_participants": 50,
        	    "created_at": "2026-01-11T03:52:00",
        		  "start_at": "2026-01-13T12:00:00",
        	    "end_at": "2026-01-15T18:00:00",
        	    "like_count": 42,
        		  "is_liked": true,
        		  "is_eligible": true,
        	    "options": [
        	      { 
        	        "option_id": "opt-001", 
        	        "name": "T1", 
        	        "option_total_amount": 1500000, 
        	        "participant_count": 30,
        	        "odds": 1.8,
        	        "is_winner": null, 
        	        "option_image_url": "https://..."
        	      },
        	      { 
        	        "option_id": "opt-002", 
        	        "name": "Gen.G", 
        	        "option_total_amount": 1200000, 
        	        "participant_count": 20,
        	        "odds": 2.25,
        	        "is_winner": null,
        	        "option_image_url": null
        	        
        	      }
        	    ],
        	    "images": [
        	      { "image_url": "https://..." }
        	    ]
        	  },
        	  {
        	    "event_id": "a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8",
        	    "title": "프리미어리그: 맨시티 vs 리버풀 승자는?",
        	    "description": "승리 할 것 같은 팀을 고르세요",
        	    "status": "OPEN",
        	    "total_participants": 50,
        	    "created_at": "2026-01-13T03:52:00",
        		  "start_at": "2026-01-15T12:00:00",
        	    "end_at": "2026-01-20T21:00:00",
        	    "like_count": 42,
        		  "is_liked": false,
        		  "is_eligible": false,
        	    "options": [
        	      { 
        	        "option_id": "opt-101", 
        	        "name": "맨시티 승리", 
        	        "option_total_amount": 3200000, 
        	        "participant_count": 22, 
        	        "odds": 2.17,
        	        "is_winner": null,
        	        "option_image_url": "https://..."
        	      },
        	      { 
        	        "option_id": "opt-102", 
        	        "name": "무승부", 
        	        "option_total_amount": 850000, 
        	        "participant_count": 6,
        	        "odds": 8.18,
        	        "is_winner": null,
        	        "option_image_url": "https://..."
        	      },
        	      { 
        	        "option_id": "opt-103", 
        	        "name": "리버풀 승리", 
        	        "option_total_amount": 2900000,
        	        "participant_count": 22, 
        	        "odds": 2.4,
        	        "is_winner": null,
        	        "option_image_url": "https://..."
        	      }
        	    ],
        	    "images": [
        	      { "image_url": "https://..." }
        	    ]
        	  }
        	],
          "next_cursor": "MjAyNi0wMS0xNVQxODowMDowMHw3ZjFjNTEzOS04ZTgwLTRkMjUtYjEyMy00NDY2NTU0NDAwMDA=",
          "has_more": true
        }
        ```
        
- **실패 응답**

| **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
| --- | --- | --- | --- |
| 400 | `ERR_002` | INVALID FIELD FORMAT | `status` 값이 잘못됨 (OPEN, CLOSED, SETTLED가 아님) |
| 422 | `ERR_036` | OUT_OF_RANGE | `limit` 값이 범위를 벗어남 (1-100) |
| 404 | `ERR_037` | INVALID_CURSOR | `cursor`로 전달된 ID가 존재하지 않음 |
| 422 | `ERR_036` | OUT_OF_RANGE | `limit` 값이 범위를 벗어남 (1-100) |

---

## 3. Betting API — 베팅 관리

사용자가 특정 이벤트의 옵션에 대해 베팅을 생성하고, 자신의 베팅 내역을 조회하는 기능을 제공합니다.

### 3-1) POST `/api/events/{event_id}/bets` — 베팅 생성

사용자가 특정 이벤트의 옵션에 대해 베팅을 생성합니다.

- **요청 (Request)**
- **Method:** `POST`
- **URL:** `/api/events/{event_id}/bets`
- **Headers:** `Authorization: Bearer {access_token}`
- **Body:**
    
    ```json
    {
      "option_id": "opt-001",
      "bet_amount": 10000
    }
    ```
    

- **성공 응답**
    - **상태 코드:** `201 Created`
    - **본문:**
        
        ```json
        {
          "bet_id": "bet-7f1c5139-8e80-4d25-b123-446655440000",
          "user_id": "user-123",
          "event_id": "7f1c5139-8e80-4d25-b123-446655440000",
          "option_id": "opt-001",
          "option_name": "브라질",
          "bet_amount": 10000,
          "created_at": "2026-01-09T00:55:00",
          "status": "PENDING"
        }
        ```
        
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 400 | `ERR_001` | `MISSING REQUIRED FIELDS` | 필수 필드(option_id, bet_amount)가 누락된 경우 |
    | 400 | `ERR_002` | `INVALID FIELD FORMAT` | bet_amount가 양수가 아니거나 유효하지 않은 경우 |
    | 400 | `ERR_011` | `INSUFFICIENT BALANCE` | 사용자의 잔액이 부족한 경우 |
    | 404 | `ERR_009` | `EVENT NOT FOUND` | 이벤트를 찾을 수 없는 경우 |
    | 404 | `ERR_012` | `OPTION NOT FOUND` | 선택한 옵션을 찾을 수 없는 경우 |
    | 409 | `ERR_013` | `EVENT NOT OPEN` | 이벤트가 OPEN 상태가 아닌 경우 (베팅 불가) |
    | 409 | `ERR_014` | `DUPLICATE BET` | 사용자가 이미 해당 이벤트에 베팅한 경우 |

---

## 4. 마이페이지

### 4-1) GET `/api/users/me/bets` — 내 베팅 상태 조회 (베팅 관리에 초점)

현재 로그인한 사용자의 전체 베팅 내역을 조회합니다.

- **URL:** `/api/users/me/bets`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {access_token}`
- **Query Parameters (Optional):**
    
    
    | **필드명** | **타입** | **필수** | **설명** | **기본값** |
    | --- | --- | --- | --- | --- |
    | `status` | String | N | 베팅 상태 필터 (`PENDING`, `WIN`, `LOSE`, `REFUNDED`) | - |
    | `limit` | Integer | N | 한 페이지당 조회할 아이템 개수 | `20` |
    | `offset` | Integer | N | 건너뛸 아이템 개수 (페이지네이션) | `0` |
- **응답 (Response)**
- **성공 응답**
    - **상태 코드:** `200 OK`
    - **본문:**
        
        ```json
        {
          "total_count": 3,
          "bets": [
            {
              "bet_id": "bet-123",
              "event_id": "ev-456",
              "event_title": "2026 LCK 스프링 결승전 승리팀은?",
              "option_id": "opt-001",
              "option_name": "T1",
              "amount": 10000,
              "status": "PENDING",
              "created_at": "2026-01-25T14:30:00"
            }
          ]
        }
        ```
        
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 400 | `ERR_003` | BAD AUTHORIZATION HEADER | Authorization 헤더 형식이 잘못됨 |
    | 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
    | 400 | `ERR_002` | INVALID FIELD FORMAT | 잘못된 쿼리 파라미터 형식 |
    | 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 (다시 로그인 필요) |

### 4-2) GET `/api/users/me/point-history` - 내 포인트 내역 조회 (포인트 추적에 초점)

- **요청 (Request)**

| **필드명** | **타입** | **필수** | **설명** | **기본값** |
| --- | --- | --- | --- | --- |
| `reason` | String | N | point history와 연동된 필터 (`SIGNUP`, `BET`, `WIN`, `LOSE`, `REFUND`,`ETC`) | - |
| `limit` | Integer | N | 한 페이지당 조회 개수 | 20 |
| `offset` | Integer | N | 페이지네이션 오프셋 | 0 |
- **응답 (Response)**
- **성공 응답**
    - **상태 코드:** `200 OK`
    - **본문:**
    
    ```json
    {
      "current_balance": 125000,
      "total_count": 3,
      "history": [
        {
          "history_id": "poi-123",
          "reason": "BET",
          "change_amount": -10000,
          "points_after": 115000,
          "bet_id": "bet-456",
          "event_id": "ev-789",
          "event_title": "2026 LCK 스프링 결승전 승리팀은?",
          "option_id": "opt-001",
          "option_name": "T1",
          "created_at": "2026-01-25T14:30:00"
        },
        {
          "history_id": "poi-124",
          "reason": "ETC",
          "change_amount": 5000,
          "points_after": 125000,
          "bet_id": null,
          "event_id": null,
          "event_title": null,
          "option_id": null,
          "option_name": null,
          "created_at": "2026-01-20T10:00:00"
        }
      ]
    }
    ```
    
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 400 | `ERR_003` | BAD AUTHORIZATION HEADER | Authorization 헤더 형식이 잘못됨 |
    | 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
    | 400 | `ERR_002` | INVALID FIELD FORMAT | 잘못된 쿼리 파라미터 형식 |
    | 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 (다시 로그인 필요) |

### 4-3) GET`/api/users/me/profile` -내 프로필 조회

- **응답 (Response)**
- **성공 응답**
    - **상태 코드:** `200 OK`
    - **본문:**
    
    ```json
    {
      "user_id": "80b1696f-9fe8-4379-b1a9-64ef59c46625",
      "email": "user1@snu.ac.kr",
      "nickname": "베팅마스터",
      "points": 85500,
      "role": "USER",
      "is_verified": true,
      "is_snu_verified": true,
      "social_type": "LOCAL",
      "created_at": "2025-12-01T10:00:00+09:00"
    }
    ```
    
- **실패 응답**
    
    
    | **상태 코드** | **에러 코드** | **메시지** | **상황** |
    | --- | --- | --- | --- |
    | 400 | `ERR_003` | BAD AUTHORIZATION HEADER | Authorization 헤더 형식이 잘못됨 |
    | 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
    | 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 (다시 로그인 필요) |

### 4-4) GET`/api/users/me/stats` - 내 통계(승률 등) 조회

**요청 (Request) (따로 파라미터 없음)**

- **Method:** `GET`
- **URL:** `/api/users/me/stats`
- **Headers:** `Authorization: Bearer {access_token}`

**응답 (Response)**

**성공 응답**

- **상태 코드:** `200 OK`
- **본문:**

```json
{
  "points": {
    "current_balance": 85500,
    "total_earned": 250000,
    "total_spent": 164500
  },
  "bets": {
    "total_bets_count": 15,
    "pending_count": 3,
    "win_count": 8,
    "lose_count": 4,
    "refunded_count": 0,
    "win_rate": 66.7
  }
}
```

- **참고: win_count + lose_count = 0 인 경우 → win_rate = 0.0 으로 처리**

**실패 응답**

| **상태 코드** | **에러 코드** | **메시지** | **상황** |
| --- | --- | --- | --- |
| 400 | `ERR_003` | BAD AUTHORIZATION HEADER | Authorization 헤더 형식이 잘못됨 |
| 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
| 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 (다시 로그인 필요) |

### 4-5) GET`/api/users/me/ranking`  -랭킹 조회 , 정각 갱신

**랭킹 계산 방식 개요**

- 배치 갱신 방식 (Scheduled Batch Update)
    
    **갱신 주기:**
    
    - 매시간 정각(00분)에 자동 갱신
    - 서버 시작 시 즉시 1회 초기 실행
    
    **계산 방식:**
    
    1. 모든 사용자를 보유 포인트(points) 기준 내림차순 정렬
    2. 순위(rank) 계산: 1위부터 순차 부여
    3. 백분위(percentile) 계산: (total_users - rank + 1) / total_users * 100
    4. Redis에 캐시 저장: user_ranking:{user_id} 키로 저장
    5. TTL 설정: 다음 정각까지 유효 (동적 계산)

**요청 (Request) (따로 파라미터 없음)**

- **Method:** `GET`
- **URL:** `/api/users/me/stats`
- **Headers:** `Authorization: Bearer {access_token}`

**응답 (Response)**

**성공 응답**

- **상태 코드:** `200 OK`
- **본문:**

```json
{
  "rank": 125,
  "total_users": 1500,
  "percentile": 8.3,
  "my_points": 85500,
}
```

- percentile: rank / total_users × 100

**실패 응답**

| **상태 코드** | **에러 코드** | **메시지** | **상황** |
| --- | --- | --- | --- |
| 400 | `ERR_003` | BAD AUTHORIZATION HEADER | Authorization 헤더 형식이 잘못됨 |
| 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
| 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 (다시 로그인 필요) |

### 4-6) PATCH `/api/users/me/nickname`

- **요청 (Request)**
    
    
    | **필드명** | **타입** | **필수** | **제약 사항** | **설명** |
    | --- | --- | --- | --- | --- |
    | **`nickname`** | String | **Y** | **2자 이상 20자 이하** | 변경할 닉네임 |
    
    ```json
    {
      "nickname": "베팅천재"
    }
    ```
    
- **성공 응답**
    - **상태 코드:** `200 OK`
    - **본문:**
    
    ```json
    {
      "message": "닉네임이 성공적으로 변경되었습니다.",
      "nickname": "베팅천재"
    }
    ```
    

- **실패 응답**
    
    
    | **상태 코드** | **에러 코드** | **메시지** | **상황** |
    | --- | --- | --- | --- |
    | 400 | ERR_002 | INVALID FIELD FORMAT | 닉네임이 너무 짧거나(2자 미만) 긴 경우(20자 초과) |
    | 409 | ERR_007 | NICKNAME ALREADY EXISTS | 이미 존재하는 닉네임 |
    | 400 | ERR_003 | BAD AUTHORIZATION HEADER | Authorization 헤더 형식이 잘못됨 |
    | 401 | ERR_004 | UNAUTHENTICATED | Authorization 헤더가 없음 |
    | 401 | ERR_005 | INVALID TOKEN | 유효하지 않거나 만료된 토큰 (다시 로그인 필요) |

### 4-7) PATCH `/api/users/me/password`

- 요청
    
    
    | **필드명** | **타입** | **필수** | **제약 사항** | **설명** |
    | --- | --- | --- | --- | --- |
    | **`current_password`** | String | **Y** | - | 현재 사용 중인 비밀번호 |
    | **`new_password`** | String | **Y** | **8자 이상 20자 이하** | 새롭게 설정할 비밀번호 |
    - 요청 예시
    
    ```json
    {
      "current_password": "OldPassword123!",
      "new_password": "NewPassword2026@"
    }
    ```
    
    - 응답 (Response)
    - 성공 (200 OK)
    
    ```json
    {
      "message": "비밀번호가 성공적으로 변경되었습니다.",
    }
    ```
    
    - **실패 응답**
        
        
        | **상태 코드** | **에러 코드** | **메시지** | **상황** |
        | --- | --- | --- | --- |
        | **400** | `ERR_002` | **INVALID_FIELD_FORMAT** | 비밀번호가 너무 짧거나(8자 미만) 긴 경우(20자 초과) |
        | 401 | `ERR_014` | INVALID CREDENTIALS | 비밀번호가 틀린 경우 |
        | 400 | `ERR_003` | BAD AUTHORIZATION HEADER | Authorization 헤더 형식이 잘못됨 |
        | 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
        | 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 (다시 로그인 필요) |
        | 400 | `ERR_047` | SOCIAL ACCOUNT NO PASSWORD | 소셜 로그인 계정은 비밀번호 변경 불가 |

---

## 5. 관리자 전용 기능

### 5-1) GET `/api/admin/events/{event_id}/bets` — 특정 이벤트의 전체 베팅 조회 (로그인 필요)

특정 이벤트에 참여한 **모든 사용자의 상세 베팅 내역**을 조회합니다. 부정 행위 모니터링을 위해 유저의 이메일과 베팅 시각을 포함합니다.

베팅 내역을 **최신 베팅 순**으로 정렬하여 반환합니다.

**권한 검증**: 요청자에게 관리자 권한이 있어야 합니다.

- **요청**
    - **쿼리 파라미터**
        
        
        | 파라미터 | 타입 | 필수 | 설명 | 기본값 | 제약사항 |
        | --- | --- | --- | --- | --- | --- |
        | page | integer | ❌ | 페이지 번호 | 1 | 1 이상 |
        | limit | integer | ❌ | 한 페이지당 조회 개수 | 20 | 1 이상 |
- **성공 응답 (200 OK)**
    
    ```json
    {
        "event_info": {
            "event_id": "7f1c5139-8e80-4d25-b123-446655440000",
            "title": "2026 LCK 스프링 결승전 승리팀은?",
            "total_bet_count": 80,
            "total_bet_amount": 750000
        },
        "bets": [
            {
                "bet_id": "a1b2c3d4-e5f6-4a5b-8c9d-0123456789ab",
                "user": {
                    "user_id": "b2c3d4e5-f6a7-4b8c-9d0e-1a2b3c4d5e6f",
                    "email": "waffle@snu.ac.kr",
                    "nickname": "토토왕"
                },
                "selected_option": {
                    "option_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                    "name": "T1"
                },
                "amount": 5000,
                "status": "PENDING",
                "created_at": "2026-01-17T12:36:00Z"
            },
            {
                "bet_id": "c7d8e9f0-a1b2-4c3d-be4f-567890abcdef",
                "user": {
                    "user_id": "d9e0f1a2-b3c4-4d5e-af6f-7a8b9c0d1e2f",
                    "email": "user1234@snu.ac.kr",
                    "nickname": "홍길동"
                },
                "selected_option": {
                    "option_id": "550e8400-e29b-41d4-a716-446655440000",
                    "name": "Gen.G"
                },
                "amount": 10000,
                "status": "PENDING",
                "created_at": "2026-01-17T11:20:05Z"
            }
        ],
        "pagination": {
            "total": 80,
            "current_page": 1,
            "limit": 20,
            "total_pages": 4
        }
    }
    ```
    
    **참고:** 전체 페이지 수보다 큰 `page` 번호를 요청할 경우, `bets` 필드는 빈 리스트(`[]`)로 반환됩니다.
    
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 400 | `ERR_003` | BAD AUTHORIZATION HEADER | Authorization 헤더 형식이 잘못됨 |
    | 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
    | 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 |
    | 404 | `ERR_009` | EVENT NOT FOUND | 이벤트를 찾을 수 없는 경우 |
    | 403 | `ERR_030` | NOT ADMIN | 관리자가 아닌 유저가 요청 |

### 5-2) PATCH `/api/admin/users/{user_id}/role` — 관리자 권한 변경 (로그인 필요)

특정 유저의 역할을 `ADMIN` 또는 `USER` 로 변경합니다.

**권한 검증**: 요청자에게 관리자 권한이 있어야 합니다.

- 요청
    
    ```json
    {
        "role": "ADMIN"
    }
    ```
    
- **성공 응답 (200 OK)**
    
    ```json
    {
        "user_id": "b2c3d4e5-f6a7-4b8c-9d0e-1a2b3c4d5e6f",
        "email": "waffle@snu.ac.kr",
        "nickname": "토토왕",
        "role": "ADMIN"
    }
    ```
    
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 400 | `ERR_001` | MISSING REQUIRED FIELDS | 필수 요청 필드가 누락됨 |
    | 400 | `ERR_002` | INVALID FIELD FORMAT | 필드 형식이 올바르지 않음 (이메일 형식 등) |
    | 400 | `ERR_003` | BAD AUTHORIZATION HEADER | Authorization 헤더 형식이 잘못됨 |
    | 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
    | 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 |
    | 403 | `ERR_030` | NOT ADMIN | 관리자가 아닌 유저가 요청 |
    | 404 | `ERR_042` | USER NOT FOUND | 유저를 찾을 수 없는 경우 |
    | 400 | `ERR_043` | SELF ROLE CHANGE DENIED | 본인의 권한을 스스로 변경하려는 경우 |

### 5-3) POST `/api/admin/users/{user_id}/suspend` — 유저 이용 정지 (로그인 필요)

특정 유저에게 정지 시간을 부여합니다. 설정된 시간이 지나기 전까지 해당 유저는 서비스를 이용(로그인)할 수 없습니다.

**처리 규칙:**

- **suspension_hours**: 필수 필드이며 **1 이상의 정수**이어야 합니다.
- **suspension_reason**: 필수 필드이며 정지 사유를 텍스트로 입력합니다. (최대 50자)

**권한 검증**: 요청자에게 관리자 권한이 있어야 합니다.

- **요청**
    
    ```json
    {
        "suspension_hours": 3,
    		"suspension_reason": "부적절한 닉네임 사용"
    }
    ```
    
- **성공 응답 (상태코드)**
    
    ```json
    {
        "user_id": "b2c3d4e5-f6a7-4b8c-9d0e-1a2b3c4d5e6f",
        "suspension_info": {
            "suspension_reason": "부적절한 닉네임 사용",
            "suspended_at": "2026-01-24T01:30:00",
            "suspended_until": "2026-01-31T01:30:00" 
        }
    }
    ```
    
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 400 | `ERR_001` | MISSING REQUIRED FIELDS | 필수 요청 필드가 누락됨 |
    | 400 | `ERR_002` | INVALID FIELD FORMAT | 필드 형식이 올바르지 않음 (이메일 형식 등) |
    | 400 | `ERR_003` | BAD AUTHORIZATION HEADER | Authorization 헤더 형식이 잘못됨 |
    | 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
    | 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 |
    | 403 | `ERR_030` | NOT ADMIN | 관리자가 아닌 유저가 요청 |
    | 404 | `ERR_042` | USER NOT FOUND | 유저를 찾을 수 없는 경우 |
    | 400 | `ERR_044` | SELF SUSPENSION DENIED | 본인 계정을 스스로 정지하려는 경우 |
    | 400 | `ERR_045` | ALREADY SUSPENDED | 이미 정지된 유저를 중복 정지하려는 경우 |

### 5-4) GET `/api/admin/users` — 관리자용 유저 목록 조회 (로그인 필요)

시스템 내의 모든 유저 정보를 검색 및 필터링하여 조회합니다.

**권한 검증**: 요청자에게 관리자 권한이 있어야 합니다.

- **요청**
    - **쿼리 파라미터**
        
        
        | 파라미터 | 타입 | 필수 | 설명 | 기본값 | 제약사항 |
        | --- | --- | --- | --- | --- | --- |
        | page | integer | ❌ | 페이지 번호 | 1 | 1 이상 |
        | limit | integer | ❌ | 한 페이지당 조회 개수 | 20 | 1 이상 |
        | search | string | ❌ | 닉네임 또는 이메일 검색어 | None |  |
        | status | enum | ❌ | 유저 상태 필터 | None | `ACTIVE`, `SUSPENDED`, `DELETED` |
- **성공 응답 (상태코드)**
    
    ```json
    {
        "users": [
            {
                "user_id": "550e8400-e29b-41d4-a716-446655440000",
                "email": "user1@snu.ac.kr",
                "nickname": "샤대생1",
                "points": 15000,
                "status": "ACTIVE",
                "role": "USER",
                "is_snu_verified": true,
                "created_at": "2026-01-15T10:00:00Z",
                "suspended_until": null
            },
            {
                "user_id": "3a1b2c3d-4e5f-6g7h-8i9j-0k1l2m3n4o5p",
                "email": "suspended_user@snu.ac.kr",
                "nickname": "문제유저",
                "points": 500,
                "status": "SUSPENDED",
                "role": "USER",
                "is_snu_verified": true,
                "created_at": "2026-01-20T15:30:00Z",
                "suspended_until": "2026-02-20T15:30:00Z"
            }
        ],
        "pagination": {
            "total": 80,
            "current_page": 1,
            "limit": 20,
            "total_pages": 4
        }
    }
    ```
    
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 400 | `ERR_003` | BAD AUTHORIZATION HEADER | Authorization 헤더 형식이 잘못됨 |
    | 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
    | 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 |
    | 403 | `ERR_030` | NOT ADMIN | 관리자가 아닌 유저가 요청 |

---

## 6. 기타 기능(랭킹, …)

### 6-1) GET `/api/users/ranking` — 유저 랭킹 조회

포인트 보유량이 높은 순서대로 유저 리스트를 반환합니다. 
****

- **요청**
    - **쿼리 파라미터**
        
        
        | 파라미터 | 타입 | 필수 | 설명 | 기본값 | 제약사항 |
        | --- | --- | --- | --- | --- | --- |
        | limit | integer | ❌ | 조회할 상위 유저 수 | 100 | 1 이상 1000 이하 |
- **성공 응답 (200 OK)**
    
    ```json
    {
        "total_count": 100000,
        "updated_at": "2026-01-30T03:54:25.989346",
        "rankings": [
            {
                "rank": 1,
                "nickname": "샤대토토왕",
                "points": 50000
            },
            {
                "rank": 2,
                "nickname": "코딩하는곰",
                "points": 45000
            },
            {
                "rank": 3,
                "nickname": "익명의고래",
                "points": 12000
            }
        ]
    }
    ```
    
    **참고:** `total_count` 는 DB에 존재하는 전체 유저 수(탈퇴유저 제외)를 의미합니다.
    
- **실패 응답**
    
    
    | **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
    | --- | --- | --- | --- |
    | 400 | `ERR_002` | INVALID FIELD FORMAT | 필드 형식이 올바르지 않음 (이메일 형식 등) |

---

## 7. 댓글 기능

### 데이터베이스 모델

**Comments 테이블 (댓글)**

- `comment_id` (UUID, PK)
- event_id (UUID, FK -> Events, ON DELETE CASCADE)
- user_id (UUID, FK -> Users, ON DELETE CASCADE)
- `content` (Text): 댓글 내용 (1~500자)
- created_at (Datetime): 작성 시각
- `updated_at` (Datetime, Nullable): 수정 시각

**관계:**

- Event(1) : Comment(N)
- User(1) : Comment(N)

**인덱스:**

- `event_id` 인덱스 (기본)

### 7-1) POST `/api/events/{event_id}/comments` — 이벤트 댓글 작성 (websocket 사용 안함, 실시간성이 중요하지 않다 판단)

특정 이벤트에 댓글을 작성

**기능 설명**

- 인증된 사용자만 댓글을 작성할 수 있습니다.
- 댓글 내용은 공백을 제외하고 1자 이상 500자 이하여야 합니다.

- 존재하는 이벤트에만 댓글을 작성할 수 있습니다.
- 작성 시각은 서버 시간 기준으로 자동 설정됩니다.

**요청 (Request)**

- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Body:**
    
    ```json
    {
      "content": "이번 경기는 공대가 이길 것 같아요!"
    }
    ```
    

**응답 (Response)**

- **상태 코드:** `201 Created`
    
    ```json
    {
      "comment_id": "c1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o",
      "event_id": "7f1c5139-8e80-4d25-b123-446655440000",
      "user_id": "u1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o",
      "nickname": "토토왕",
      "content": "이번 경기는 공대가 이길 것 같아요!",
      "created_at": "2026-01-30T10:30:00Z",
      "updated_at": null
    }
    ```
    

**실패 응답**

| **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
| --- | --- | --- | --- |
| 400 | `ERR_001` | `MISSING REQUIRED FIELDS` | content 필드가 누락됨 |
| 400 | `ERR_002` | `INVALID FIELD FORMAT` | content가 1자 미만이거나 500자 초과 |
| 400 | `ERR_048` | `EMPTY COMMENT CONTENT` | 댓글 내용이 공백만으로 구성됨 |
| 401 | `ERR_004` | `UNAUTHENTICATED` | Authorization 헤더가 없음 |
| 401 | `ERR_005` | `INVALID TOKEN` | 유효하지 않거나 만료된 토큰 |
| 404 | `ERR_009` | `EVENT NOT FOUND` | 이벤트를 찾을 수 없음 |

### 7-2) **GET `/api/events/{event_id}/comments` — 댓글 목록 조회**

특정 이벤트의 댓글 목록을 커서 기반 **페이지네이션**으로 조회합니다.

**기능 설명**

- 인증 없이 누구나 댓글 목록을 조회할 수 있습니다.
- 최신 댓글이 먼저 표시됩니다 (created_at DESC, comment_id DESC).
- 복합 커서 기반 페이지네이션을 사용하여 정확하고 효율적으로 대량의 댓글을 조회합니다.
- 커서는 {created_at}_{comment_id} 형식을 Base64로 인코딩하여 불투명한 토큰으로 제공됩니다.
- 각 댓글에는 작성자의 닉네임이 포함됩니다.

**요청 (Request)**

- **Query Parameters:**
    - cursor (String, Optional): 다음 페이지를 가져오기 위한 Base64 인코딩된 커서
    - limit (Integer, Optional, Default: 20): 한 번에 가져올 댓글 수 (1~100)

**응답 (Response)**

- **상태 코드:** `200 OK`
    
    ```json
    {
      "comments": [
        {
          "comment_id": "c3a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o",
          "event_id": "7f1c5139-8e80-4d25-b123-446655440000",
          "user_id": "u1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o",
          "nickname": "토토왕",
          "content": "이번 경기는 공대가 이길 것 같아요!",
          "created_at": "2026-01-30T10:30:00Z",
          "updated_at": null
        },
        {
          "comment_id": "c2a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o",
          "event_id": "7f1c5139-8e80-4d25-b123-446655440000",
          "user_id": "u2a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o",
          "nickname": "베팅마스터",
          "content": "자연대도 가능성 있어 보입니다.",
          "created_at": "2026-01-30T09:15:00Z",
          "updated_at": "2026-01-30T09:20:00Z"
        }
      ],
      "next_cursor": "MjAyNi0wMS0zMFQwOToxNTowMFpfYzJhMmIzYzQtZDVlNi03ZjhnLTloMGktMWoyazNsNG01bjZv",
      "has_more": true
    }
    ```
    

**실패 응답**

| **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
| --- | --- | --- | --- |
| 400 | `ERR_002` | INVALID FIELD FORMAT | limit이 1~100 범위를 벗어남 |
| 404 | `ERR_037` | INVALID_CURSOR | `cursor` 가 유효하지 않은 경우 |
| 404 | `ERR_009` | EVENT NOT FOUND | 이벤트를 찾을 수 없는 경우 |

### **7-3) PATCH `/api/comments/{comment_id}` — 댓글 수정**

자신이 작성한 댓글의 내용을 수정합니다.

**기능 설명**

- 댓글 작성자 본인만 수정할 수 있습니다.
- 수정된 내용도 1자 이상 500자 이하여야 합니다.
- 수정 시각(updated_at)이 서버 시간 기준으로 자동 업데이트됩니다.
- 관리자라도 타인의 댓글 내용을 수정할 수 없습니다 (삭제만 가능).

**요청 (Request)**

- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Body:**
    
    ```json
    {
      "content": "수정된 댓글 내용입니다."
    }
    ```
    

**응답 (Response)**

- **상태 코드:** `200 OK`
    
    ```json
    {
      "comment_id": "c1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o",
      "event_id": "7f1c5139-8e80-4d25-b123-446655440000",
      "user_id": "u1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o",
      "nickname": "토토왕",
      "content": "수정된 댓글 내용입니다.",
      "created_at": "2026-01-30T10:30:00Z",
      "updated_at": "2026-01-30T11:00:00Z"
    }
    ```
    

**실패 응답**

| **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
| --- | --- | --- | --- |
| 400 | `ERR_001` | `MISSING REQUIRED FIELDS` | content 필드가 누락됨 |
| 400 | `ERR_002` | `INVALID FIELD FORMAT` | content가 1자 미만이거나 500자 초과 |
| 400 | `ERR_048` | `EMPTY COMMENT CONTENT` | 댓글 내용이 공백만으로 구성됨 |
| 401 | `ERR_004` | `UNAUTHENTICATED` | Authorization 헤더가 없음 |
| 401 | `ERR_005` | `INVALID TOKEN` | 유효하지 않거나 만료된 토큰 |
| 404 | `ERR_049` | `COMMENT NOT FOUND` | 댓글을 찾을 수 없음 |
| 403 | `ERR_050` | `NOT COMMENT OWNER` | 댓글 작성자가 아님 |

### 7-4) **DELETE `/api/comments/{comment_id}` — 댓글 삭제**

댓글을 삭제합니다.

**기능 설명**

- 댓글 작성자 본인만 삭제할 수 있습니다.
- 관리자(ADMIN)는 모든 댓글을 삭제할 수 있습니다.
- 데이터베이스에서 완전히 삭제됩니다 (Soft Delete 없음).
- 삭제된 댓글은 복구할 수 없습니다.

**요청 (Request)**

- **Headers:** `Authorization: Bearer <JWT_TOKEN>`

**응답 (Response)**

- **상태 코드:** `204 No Content`

**실패 응답**

| **상태 코드** | **ERROR_CODE** | **ERROR_MSG** | **상황** |
| --- | --- | --- | --- |
| 401 | `ERR_004` | `UNAUTHENTICATED` | Authorization 헤더가 없음 |
| 401 | `ERR_005` | `INVALID TOKEN` | 유효하지 않거나 만료된 토큰 |
| 404 | `ERR_049` | `COMMENT NOT FOUND` | 댓글을 찾을 수 없음 |
| 403 | `ERR_050` | `NOT COMMENT OWNER` | 댓글 작성자도 아니고 관리자도 아님 |

## 8. 좋아요 기능

사용자는 이벤트에 좋아요를 추가하거나 취소할 수 있으며, 각 이벤트의 좋아요 수와 본인의 좋아요 여부를 확인할 수 있음

### **데이터베이스 모델 설계**

### **Event_likes 테이블**

- `like_id` (UUID, PK): 좋아요 고유 식별자
- event_id (UUID, FK -> Events): 좋아요한 이벤트
- user_id (UUID, FK -> Users): 좋아요한 사용자
- created_at (Datetime): 좋아요 생성 시각

**제약 조건:**

- UNIQUE(event_id, user_id): 한 사용자는 하나의 이벤트에 한 번만 좋아요 가능
- `ON DELETE CASCADE`: 이벤트나 사용자 삭제 시 관련 좋아요 자동 삭제

### Events 테이블 수정

기존 Events 테이블에 다음 컬럼 추가:

- `like_count` (Integer, Default 0): 해당 이벤트의 총 좋아요 수
    - CheckConstraint: `like_count >= 0`

### 8-1) **POST `/api/events/{event_id}/likes` — 좋아요 추가**

로그인한 사용자가 특정 이벤트에 좋아요를 추가

**요청**

- Path Parameter: event_id (String)
- Header: `Authorization: Bearer <access_token>`
- Request Body: 없음

**성공 응답**

```json
{
    "like_id": "a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6",
    "event_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "user_id": "7ca32b1a-1234-4567-8901-abcdef123456",
    "created_at": "2026-01-30T10:30:00Z"
}
```

**실패 응답:**

| 상태 코드 | ERROR_CODE | ERROR_MSG | 상황 |
| --- | --- | --- | --- |
| 400 | `ERR_003` | BAD AUTHORIZATION HEADER | Authorization 헤더 형식이 잘못됨 |
| 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
| 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 |
| 404 | `ERR_009` | EVENT NOT FOUND | 해당 이벤트가 존재하지 않음 |
| 409 | `ERR_052` | LIKE ALREADY EXISTS | 이미 좋아요를 누른 이벤트 |

### 8-2) **DELETE `/api/events/{event_id}/likes` — 좋아요 취소**

로그인한 사용자가 특정 이벤트의 좋아요를 취소

**좋아요 레코드는 DB에서 완전히 삭제**

**요청:**

- Path Parameter: event_id (String)
- Header: `Authorization: Bearer <access_token>`
- Request Body: 없음

**성공 응답 (200 OK):**

```json
{
    "message": "좋아요가 취소되었습니다.",
    "event_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

**실패 응답:**

| 상태 코드 | ERROR_CODE | ERROR_MSG | 상황 |
| --- | --- | --- | --- |
| 400 | `ERR_003` | BAD AUTHORIZATION HEADER | Authorization 헤더 형식이 잘못됨 |
| 401 | `ERR_004` | UNAUTHENTICATED | Authorization 헤더가 없음 |
| 401 | `ERR_005` | INVALID TOKEN | 유효하지 않거나 만료된 토큰 |
| 404 | `ERR_009` | EVENT NOT FOUND | 해당 이벤트가 존재하지 않음 |
| 404 | `ERR_053` | LIKE NOT FOUND | 좋아요를 누르지 않은 이벤트 |