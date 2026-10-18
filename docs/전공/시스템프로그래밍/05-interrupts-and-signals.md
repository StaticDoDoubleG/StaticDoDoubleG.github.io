# 05. Interrupt와 Signal
개인적으로 시스템프로그래밍에서 인상깊은 대목이라고 생각한다.<br> 특별한 이유가 있는 것은 아니고 이걸 들었던 23년도에 기억나는 내용이 이거랑 mutex 밖에 없기 때문이다. (ㅠㅠ)<br>
나머지 내용은 탈력발작 이슈로 제대로 머리에 들어오지 않았다.<br>
원래 대학생은 이렇게 사는 것이다.
<p align="center">
  <img src="/uploads/images/1792306459892-971205502.png" width="500">
</p>

대략적인 개요이다. 시그널은 꽤나 번잡한 내용이 많기 때문에 인터럽트부터 다루겠다.

## Interrupt란?

Interrupt는 하드웨어 장치가 프로세서에 처리가 필요한 사건을 알리는 메커니즘이다. 장치가 Interrupt 요청을 발생시키면 프로세서는 현재 실행을 잠시 중단하고 운영체제의 Interrupt 서비스 루틴을 실행한다.

일반적인 흐름은 다음과 같다.

1. 주변 장치가 하드웨어 플래그를 설정한다.
2. CPU가 명령어 실행 사이에 플래그를 확인한다.
3. Interrupt가 감지되면 현재 프로그램 카운터와 필요한 실행 상태를 저장한다.
4. Interrupt 서비스 루틴의 주소로 이동한다. (ISR 실행)
5. 장치 사건을 처리하고 저장된 위치에서 원래 프로그램을 재개한다.

## Interrupt의 종류
Interrupt는 **발생 주체/원인**과 **동기성**에 따라 아래와 같이 분류된다.
### 발생 주체/원인에 따른 분류
- **하드웨어 인터럽트**<br>
	컴퓨터 주변 장치(I/O 디바이스)나 외부 하드웨어가 CPU에 신호를 보내 발생시키는 인터럽트
    
  - **Device/IO Interrupt**<br>
  	키보드 입력, 마우스 클릭, 프린트 요청, 디스크 입출력 완료 등
  - **Timer Interrupt**<br>
  	Time Sharing 시스템에서 프로세스에게 할당된 실행 시간(Time Quantum)이 만료되었을 때 OS 타이머에 의해 발생
 
- **소프트웨어 인터럽트**<br>
	실행 중인 프로세스 내부에서 명령어를 수행하는 도중 의도적으로 요청하거나 오류로 인해 발생하는 인터럽트
    
    - **System Call / Trap(Intended)**<br>
    	유저 프로세스가 커널의 리소스나 입출력 서비스(파일 읽기/쓰기, 프로세스 생성 등)를 이용하기 위해 커널 모드로 전환할 때 호출
    - **Exception / Fault / Trap(Unintended)**: <br>
    	프로그램 실행 중 0으로 나누기(`divide-by-zero`), 부적절한 명령어(`illegal instruction`), 버퍼 오버플로우로 인한 메모리 침범 등의 오류가 발생했을 때 호출
### 동기성(Synchrony)에 따른 분류
- **비동기적 인터럽트**<br>
	언제 발생할지 예측할 수 없는 시간(Unpredictable time)과 순서(Unpredictable order)로 일어나는 외부 이벤트
    
    - 사용자의 키보드 입력
    - 터미널에서 `Ctrl+C` 입력
    - I/O 디바이스의 작업 완료 통보
    - 타이머 만료 등

- **동기적 인터럽트**<br>
	CPU가 프로그램을 순차적으로 실행하다가 특정 인스트럭션을 수행하는 순간 정해진 시점에 일어나는 인터럽트
    - 0으로 나누기 연산
    - 잘못된 인스트럭션 실행 등 소스코드 상의 특정 명령 수행 시점에 맞물려 발생하는 경우



## Signal
~시그널 보내 시그널 보내 찌릿찌릿찌릿찌릿~
<p align="center">
  <img src="/uploads/images/1792306549248-387783709.jpg" width="200">
  </p><p align="center">
벼락치기를 하는 나에 모습
</p>
Signal은 운영체제가 프로세스에 사건을 통지하는 소프트웨어 메커니즘이다. <br>
Interrupt가 프로세서와 운영체제 수준의 사건이라면, Signal은 프로세스가 반응할 수 있는 비동기적인 통지라고 볼 수 있다.

예를 들어 사용자가 키보드 인터럽트인 `Ctrl+C`를 누르면 다음과 같은 흐름이 된다.

```text
키보드 입력 -> 장치 인터럽트 -> 운영체제 처리 -> 프로세스에 SIGINT 전달
```

프로세스는 시그널을 기본 동작으로 처리하거나, 무시하거나, 핸들러를 등록해 직접 처리할 수 있다. 종료 시그널을 무조건 무시하면 사용자가 프로세스를 제어하기 어려워질 수 있으므로 자원 정리와 종료 정책을 함께 설계한다.

### Signal의 종류
1. 프로세스 종료 및 제어 시그널
|이름|번호|동작|설명|
|-|-|-|-|
|SIGHUP|1|종료|터미널 연결이 끊어졌을 때 발생|
|SIGINT|2|종료|`Ctrl+C` 입력 시 발생|
|SIGQUIT|3|코어 덤프|`Ctrl+\` 입력 시 발생|
|SIGABRT/SIGIOT|6|코어 덤프|`abort()` 함수 호출 시 스스로 비정상 종료 요청|
|SIGKILL|9|비정상(강제) 종료|프로세스가 이 시그널을 차단(Block)하거나 무시/포착할 수 없음(강제)|
|SIGTERM|15|종료|정상적인 종료 작업 수행 요청|

2. 프로세스 상태 및 타이머 관련 시그널
|이름|번호|동작|설명|
|-|-|-|-|
|SIGALRM|14|종료|`alarm()` 시스템 콜로 설정한 타이머 시간이 만료되었을 때 프로세스에게 전달|
|SIGCHLD|17|무시|자식 프로세스가 종료되거나 일시 중단/재개되었을 때 부모 프로세스에게 상태 변경 통지가 전달|
|SIGCONT|18|재개|SIGSTOP/SIGTSTP으로 인해 종료된 프로세스에 한함|
|SIGSTOP|19|중단| **즉시 일시 중단**, 프로세스가 이 시그널을 차단(Block)하거나 무시/포착할 수 없음(강제)|
|SIGTSTP|20|중단|프로세스가 이 시그널을 차단(Block)하거나 무시/포착할 수 없음(강제)|
|SIGTTIN|21|중단|백그라운드 프로세스가 제어 터미널에서 읽기 시도 시 발생|
|SIGTTOU|22|중단|백그라운드 프로세스가 제어 터미널로 쓰기 시도 시 발생|
|SIGVTALRM|26|종료|프로세스 가상 타이머(Virtual Timer) 만료 시 발생|
|SIGPROF|27|종료|프로파일링 타이머(Profiling Timer) 만료 시 발생|

3. 프로그램 예외 및 오류 시그널(동기적 시그널)
|이름|번호|동작|설명|
|-|-|-|-|
|SIGILL|4|코어 덤프|허용되지 않거나 잘못된 CPU 명령어(Instruction)를 실행하려 할 때 발생|
|SIGTRAP|5|코어 덤프|디버거 트랩 및 브레이크포인트 실행 시 발생|
|SIGBUS|7|코어 덤프|정렬되지 않은 메모리 접근 등 잘못된 버스 참조 시 발생|
|SIGFPE|8|코어 덤프|0으로 나누기(`divide-by-zero`)나 연산 오버플로우 등 산술적 예외가 일어났을 때 발생|
|SIGSEGV|11|SegFault, 코어 덤프|허용되지 않은 메모리 영역을 참조하거나 버퍼 오버플로우 등 메모리 침범(Segmentation Fault) 오류 시 발생|
|SIGPIPE|13|종료|읽는 주체가 닫힌 파이프/소켓에 쓰기 시도 시 발생|
|SIGSTKFLT|16|종료|스택 에러 (부동소수점 코프로세서 관련)|
|SIGXCPU|24|코어 덤프|할당된 CPU 사용 시간 제한 초과 시 발생|
|SIGXFSZ|25|코어 덤프|생성 가능한 최대 파일 크기 제한 초과 시 발생|
|SIGSYS|31|코어 덤프|존재하지 않거나 유효하지 않은 시스템 콜 호출 시 발생|
4. 그 외 시스템, 입출력(I/O) 및 기타 이벤트 시그널
|이름|번호|동작|설명|
|-|-|-|-|
|SIGURG|23|무시|소켓 네트워크에 긴급 데이터(Out-Of-Band Data) 수신 시|
|SIGWINCH|28|무시|터미널 창 크기(행/열) 변경 시 발생|
|SIGIO/SIGPOLL|29|종료|파일 디스크립터에서 입출력 작업이 가능해졌을 때 발생|
|SIGPWR|30|종료|시스템 전원 장치 이상/전원 비상 시 발생|

5. 사용자 정의 시그널
|이름|번호|동작|설명|
|-|-|-|-|
|SIGUSR1|10|종료/정의 가능|첫 번째 사용자 정의 시그널|
|SIGUSR2|12|종료/정의 가능|두 번째 사용자 정의 시그널|

- **코어 덤프(Core Dump)** 는 프로세스가 비정상 종료(Crash)되는 시점의 메모리 상태를 기록한 파일이다. 여기선 코어 덤프 작성 후 종료를 일컫는다.

### Signal Handler
앞서 말한 **핸들러**에 대해 설명해보겠다.<br>
Signal Handler는 프로세스가 특정 Signal을 수신했을 때, 운영체제(OS)의 기본 동작(프로세스 강제 종료 등)을 수행하는 대신 **실행하도록 등록해 둔 사용자 정의 함수**이다.<br>
핸들러를 설정하려면 다음 함수를 사용하여 설정한다.
- `signal()`<br>
간단한 시그널 핸들러 등록 함수
- `sigaction()`<br>
시그널 마스킹, 플래그 설정 등 시그널 처리 동작을 더 안전하고 정밀하게 제어할 수 있는 표준 시스템 콜
#### Signal Handler 구현 예
1. Ctrl+C (SIGINT) 포착 및 처리 예제
```c
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <unistd.h>

// SIGINT(Ctrl+C) 수신 시 실행될 시그널 핸들러
void sigint_handler(int sig) {
    printf("\n[시그널 포착] Ctrl+C(SIGINT, 번호 %d)를 감지했습니다. 프로그램을 종료하지 않습니다!\n", sig);
}

int main(void) {
    struct sigaction sa;

    // 1. 핸들러 함수 지정
    sa.sa_handler = sigint_handler;
    // 2. 핸들러 실행 중 블록할 시그널 집합 초기화
    sigemptyset(&sa.sa_mask);
    // 3. 플래그 설정
    sa.sa_flags = 0;

    // SIGINT 시그널에 대한 핸들러 등록
    if (sigaction(SIGINT, &sa, NULL) == -1) {
        perror("sigaction 설정 실패");
        exit(1);
    }

    printf("프로세스 시작 (PID: %d). Ctrl+C를 눌러보세요.\n", getpid());

    while (1) {
        printf("작업 수행 중...\n");
        sleep(2);
    }

    return 0;
}
```
2. 사용자 정의 시그널 (`SIGUSR1`) 처리 예제
```c
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <unistd.h>

int usr1_count = 0;

// SIGUSR1 수신 시 실행될 핸들러
void sigusr1_handler(int sig) {
    usr1_count++;
    printf("\n[SIGUSR1 수신] 사용자 정의 시그널을 %d번째 수신했습니다.\n", usr1_count);
}

int main(void) {
    struct sigaction sa;

    sa.sa_handler = sigusr1_handler;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = 0;

    if (sigaction(SIGUSR1, &sa, NULL) == -1) {
        perror("sigaction 설정 실패");
        exit(1);
    }

    printf("프로세스 실행 중 (PID: %d)\n", getpid());
    printf("다른 터미널 창에서 'kill -10 %d' 또는 'kill -USR1 %d' 명령을 입력하세요.\n", getpid(), getpid());

    while (1) {
        sleep(1);
    }

    return 0;
}
```

3. 자식 프로세스 종료 (`SIGCHLD`) 비동기 처리 예제
```c
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

// 자식 프로세스 종료 통지를 처리하는 핸들러
void sigchld_handler(int sig) {
    int status;
    pid_t pid;

    // 비동기적으로 종료된 자식 프로세스의 PID 및 리턴값 회수 (좀비 프로세스 방지)
    while ((pid = waitpid(-1, &status, WNOHANG)) > 0) {
        if (WIFEXITED(status)) {
            printf("\n[SIGCHLD 핸들러] 자식 프로세스(PID: %d) 종료 감지! (리턴값: %d)\n",
                   pid, WEXITSTATUS(status));
        }
    }
}

int main(void) {
    struct sigaction sa;

    sa.sa_handler = sigchld_handler;
    sigemptyset(&sa.sa_mask);
    // SA_RESTART: 시그널 수신으로 중단된 시스템 콜을 자동 재시도
    sa.sa_flags = SA_RESTART;

    if (sigaction(SIGCHLD, &sa, NULL) == -1) {
        perror("sigaction 설정 실패");
        exit(1);
    }

    pid_t pid = fork();

    if (pid < 0) {
        perror("fork 실패");
        exit(1);
    } else if (pid == 0) {
        // 자식 프로세스 코드
        printf("자식 프로세스 생성됨 (PID: %d). 2초간 작업 수행...\n", getpid());
        sleep(2);
        printf("자식 프로세스 작업 완료, exit(42) 호출\n");
        exit(42); // 리턴값 42를 부모에게 전달하며 종료
    } else {
        // 부모 프로세스 코드
        printf("부모 프로세스(PID: %d)는 자식의 종료를 대기하지 않고 계속 작업 수행\n", getpid());

        for (int i = 0; i < 5; i++) {
            printf("부모 작업 진행 중... (%d/5)\n", i + 1);
            sleep(1);
        }
    }

    return 0;
}
```
~하... 존나 길다. 인생 쓰다.~

#### 주의사항
- **예외 시그널**: **9번 (`SIGKILL`)** 과 **19번 (** **SIGSTOP** **)** 시그널은 커널이 무조건 처리해야 하므로 시그널 핸들러를 등록하거나 무시할 수 없다.
- **비동기적 실행**: 시그널은 언제 도달할지 예측할 수 없는 비동기 이벤트이므로, 시그널 핸들러 내에서는 비동기적으로 안전하게 호출할 수 있는 함수(Async-signal-safe functions, 예: `write()`, `_exit()` 등)를 사용하는 것이 권장된다.

### `SIGINT`를 기록하는 예

```c
#include <signal.h>
#include <unistd.h>

static volatile sig_atomic_t interrupted = 0;

static void handle_sigint(int signal_number) {
	(void)signal_number;
	interrupted = 1;
}

int main(void) {
	signal(SIGINT, handle_sigint);
	while (!interrupted) {
		pause();
	}
	return 0;
}
```

실행 중 `Ctrl+C`를 누르면 핸들러가 직접 복잡한 정리를 수행하는 대신 플래그만 바꾸고, 주 실행 흐름이 루프를 빠져나온다. 시그널 핸들러 안에서 `printf`처럼 안전성이 보장되지 않는 함수를 호출하지 않는 이유를 보여주는 예다.

## 동기적·비동기적 시그널

- 동기적 시그널: 현재 실행 명령의 결과로 발생한다. 잘못된 메모리 접근이나 0으로 나누기 등이 예다.
- 비동기적 시그널: 프로세스의 현재 실행 위치와 무관하게 도착한다. `Ctrl+C`에 따른 `SIGINT`가 예다.

비동기 시그널은 코드의 어느 지점에서든 도착할 수 있다. 따라서 핸들러 안에서 복잡한 로직이나 안전하지 않은 라이브러리 호출을 수행하면 실행 상태가 꼬일 수 있다. 핸들러에서는 최소한의 표시나 플래그 설정만 하고 실제 정리는 주 실행 흐름에서 수행하는 방식이 안전하다.

## 시스템 콜과 실행 흐름

프로세스가 파일 읽기 같은 시스템 콜을 호출하면 사용자 코드에서 커널 코드로 제어가 넘어간다. 이 전환은 일반 함수 호출과 달리 권한 수준과 실행 문맥이 바뀐다. 시스템 콜이 끝나면 반환값과 `errno`를 통해 성공 또는 실패를 확인한다.

시그널과 시스템 콜의 관계는 다음처럼 나타낼 수 있다.

```text
프로세스: read() 호출 -> 커널에서 대기
						 ^
						 | SIGINT 도착
프로세스: read()가 EINTR로 반환 -> 반환값 검사 -> 재시도 또는 종료
```

시그널은 실행 중인 시스템 콜을 중단할 수 있으므로, 시스템 콜이 실패했다는 사실만 보고 곧바로 장치 오류라고 단정하지 않고 `errno == EINTR`인지 확인해야 한다.

