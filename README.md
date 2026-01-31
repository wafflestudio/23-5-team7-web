# overview
- react와 vite를 활용한 프론트엔드 개발
- 프로젝트 주제: 토토 사이트
- 주요 기능: 회원가입, 로그인, 배팅, 결과 확인

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
        
        **Body(Form Data) -** 이미지 파일들과 JSON 데이터
        
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

- 상태가 `"CLOSED"`인 이벤트에 대해 승리한 옵션의 ID를 지정하여 포인트를 정산합니다. 해당 이벤트는 `"SETTLED"` 상태가 됩니다.

- **권한 검증**: 요청자에게 관리자 권한이 있어야 합니다.

- **요청**
    
    ```json
    {
        "winner_option_id": ["opt-1-uuid...", ... ]
    }
    ```
    
- **응답 (200)**
    
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
    | 400 | `ERR_032` | NOT CLOSED | CLOSED가 아닌 이벤트에 대해 정산하려고 하는 경우 |
    | 400 | `ERR_035` | INVALID WINNER OPTION | 승리 옵션 ID가 해당 이벤트의 옵션 목록에 없는 경우 |

### 2-4) GET `/api/events/{event_id}` — 이벤트 상세 조회

특정 이벤트의 상세 정보와 해당 이벤트에 포함된 모든 선택지(Options) 및 이미지 정보를 조회.

**기능 설명**

- 이벤트 ID를 경로 파라미터로 받아 해당 데이터가 존재하는지 확인.
- 응답에는 각 옵션별 `total_bet_amount`(총 배팅 금액)가 포함되어 실시간 배팅 현황을 보여줌.

- **요청 (Request)**
- **Method:** `GET`
- **URL:** `/api/events/{event_id}`

- **응답 (Response)**
- **상태 코드:** `200 OK`
    
    ```json
    {
      "event_id": "7f1c5139-8e80-4d25-b123-446655440000",
      "title": "2026 월드컵 결승전 승자",
      "description": "결승전 승자를 예측하세요",
      "status": "OPEN",
      "total_participants": 50,
      "end_at": "2026-01-15T18:00:00",
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

### 2-5) GET `/api/events` — 이벤트 목록 조회

전체 이벤트 목록을 커서 기반 페이지네이션으로 조회. `status` 쿼리 파라미터를 통해 특정 상태의 이벤트만 필터링

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
```

- **성공 응답**
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
        	    "end_at": "2026-01-15T18:00:00",
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
        	    "end_at": "2026-01-20T21:00:00",
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