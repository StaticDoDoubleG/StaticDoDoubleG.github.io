# 07. Program, Process와 Thread

릴스에 종종 나오는 CS 학생 인터뷰를 본 적이 있는가?<br>
거기서 줄곧 물어보는게 시시콜콜한 질문이라 생각이 들수 있지만 우리는 이 질문들에 대한 답을 할 줄 알아야 CS 학생으로서 인간 대접을 받을 수 있다. ~나는 인간이 아닐 수도 있다.~<br>
거기서 나오는 적지 않은 CS 학생들이 대답을 모호하게 하거나 틀린 답을 하여 수많은 인터넷 망령들의 조롱을 받는다.<br>

Program, Process, Thread의 구분을 똑바로 하지 못하면 이런 멸시를 받는 것과 별개로 다음에 이해해야 할 내용을 학습하는데 상당한 차질이 발생한다. 즉 정신을 똑바로 차리고 알아야 한다.

## Program과 Process

<p align="center">
  <img src="/uploads/images/1792318559266-966097940.png" width="500">
</p>
Program은 어떤 작업을 수행하기 위한 명령어와 데이터가 준비된 정적인 결과물이다. C 소스 파일을 컴파일하면 오브젝트 파일이 만들어지고, 링커가 여러 오브젝트 파일과 라이브러리를 결합해 실행 파일을 만든다.

Process는 그 프로그램이 실제로 실행 중인 인스턴스(메모리에 생성된 구체적인 실체)다. 운영체제가 PID, 실행 상태, 주소 공간, 열린 자원 등 실행에 필요한 정보를 등록하고 자원을 할당하면 프로그램은 프로세스가 된다.

```text
source.c -> compiler -> object file -> linker -> executable
                                                     |
                                                     v
                                              running process
```

같은 실행 파일을 여러 번 실행하면 하나의 Program에서 여러 Process가 생길 수 있다. 각각의 프로세스는 서로 다른 PID와 실행 상태를 가진다.

## Program Image의 메모리 구조

프로세스의 주소 공간은 보통 아래와 같이 여러 영역으로 나누어 생각한다.

| 영역 | 주요 내용 | 일반적인 수명 |
|-|-|-|
| text | 실행할 명령어 | 프로세스 실행 동안 |
| initialized data | 초기값이 있는 전역·정적 변수 | 프로세스 전체 |
| uninitialized data | 초기화되지 않은 전역·정적 변수 | 프로세스 전체 |
| heap | 동적 메모리 | `malloc`부터 `free`까지 |
| stack | 함수 호출 문맥, 자동 변수 | 함수 호출 동안 |

함수가 호출되면 스택에 Activation Record가 만들어진다. 반환 주소, 매개변수, 일부 레지스터 상태, 자동 변수가 이 영역에 저장될 수 있다. 함수 호출이 끝나면 해당 함수의 자동 변수는 더 이상 유효하지 않다.

이 구조는 앞서 다룬 Buffer Overflow와도 직접 연결된다. 지역 배열이 있는 활성화 레코드 바깥으로 데이터를 쓰면 다른 변수나 반환에 필요한 실행 정보까지 손상될 수 있다.

## Thread of Execution

프로그램 카운터는 다음에 실행할 명령어의 주소를 가리킨다. Thread of Execution은 프로그램 카운터가 따라가는 명령어 주소의 흐름이다.

```text
Thread A: 245 -> 246 -> 247 -> 245 -> 246 -> ...
Thread B:  10 ->  11 ->  12 ->  13 -> ...
```

운영체제가 CPU를 다른 실행 단위에 넘기면 문맥 전환이 일어난다. 실행 순서는 다음처럼 섞일 수 있다.

```text
A: 245, 246, 247, 245, 246
context switch
B: 10, 11, 12, 13
context switch
A: 247, 245, 246, ...
```

따라서 여러 실행 흐름의 출력 순서나 공유 데이터의 최종값을 특정 순서로 가정해서는 안 된다.

## Process와 Thread의 차이

Thread는 자신의 실행 스택, 프로그램 카운터, 레지스터 집합, 실행 상태를 가진다. 하지만 같은 프로세스에 속한 스레드들은 text, 전역 데이터, heap, 열린 자원 같은 프로세스 자원을 공유한다.

| 구분 | Process | Thread |
|-|-|-|
| 주소 공간 | 서로 분리 | 같은 프로세스 안에서 공유 |
| 생성·전환 비용 | 상대적으로 큼 | 상대적으로 작음 |
| 오류 격리 | 비교적 쉬움 | 한 스레드의 오류가 전체에 영향 |
| 통신 | 별도의 IPC 필요 | 공유 메모리 사용 가능 |
| 주의점 | 자원 전달과 수거 | 공유 데이터 동기화 |

프로세스는 격리에 유리하고 스레드는 낮은 비용의 동시 실행에 유리하다. 어느 쪽이 항상 더 좋은 것이 아니라, 공유가 필요한지와 오류를 얼마나 분리해야 하는지를 보고 선택해야한다.

## 오류 반환과 `errno`

전통적인 UNIX 함수는 실패하면 `-1`이나 `NULL`을 반환하고 `errno`에 원인을 기록한다.

```c
int fd = open("data.txt", O_RDONLY);
if (fd == -1) {
    perror("open");
    return -1;
}
```

`errno`는 함수 호출 전에 미리 0으로 만들고 무조건 확인하는 값이 아니다. 먼저 반환값으로 실패를 확인하고, 실패한 직후 `errno`를 해석해야 한다. `perror`는 현재 오류 메시지를 출력하고 `strerror`는 오류 번호를 문자열로 바꾼다.

좋은 함수는 오류가 났다고 내부에서 프로세스를 종료하지 않고 호출자에게 오류를 돌려준다. 호출자가 오류를 복구하거나 적절한 종료를 결정할 수 있어야 함수가 재사용된다.

## 명령행 인자

셸은 명령행을 토큰으로 나누어 `main`의 인자 배열로 전달한다.

```c
int main(int argc, char *argv[]) {
    for (int i = 0; i < argc; i++) {
        printf("argv[%d] = %s\n", i, argv[i]);
    }
    return 0;
}
```

`mine -c 10 2.0`을 실행하면 `argv[0]`에는 프로그램 이름이 들어가고 실제 인자는 `argv[1]`부터 시작한다. `argv[argc]`는 `NULL` 포인터다. 숫자 인자는 문자열이므로 변환 실패와 범위를 별도로 검사해야 한다.

## `strtok`와 Thread Safety

`strtok`는 문자열을 구분자로 나누고 다음 호출에서 이어서 처리할 위치를 내부 정적 변수에 저장한다.

```c
char *token = strtok(input, ",");
while (token != NULL) {
    token = strtok(NULL, ",");
}
```

문제는 다음 파싱 위치가 호출자에게 전달되지 않는다는 것이다. 첫 번째 문자열을 파싱하는 중에 다른 문자열에 대해 `strtok`를 호출하면 내부 상태가 덮어써진다. 이 문제는 다중 스레드에서만 생기는 것이 아니라, 하나의 스레드가 두 파싱 작업을 교차해도 발생한다.

POSIX의 `strtok_r`는 상태 저장 공간을 호출자가 제공한다.

```c
char *state = NULL;
char *token = strtok_r(input, ",", &state);
while (token != NULL) {
    token = strtok_r(NULL, ",", &state);
}
```

각 파싱 작업에 별도의 `state`를 사용하면 상태가 섞이지 않는다. 다만 `_r` 함수라고 해서 입력 버퍼를 여러 스레드가 동시에 수정해도 된다는 뜻은 아니다.

## Static Variable과 Process Environment

정적 변수는 함수 호출이 끝난 뒤에도 값을 유지하므로 내부 상태를 기억하는 데 유용하다. 그러나 여러 스레드가 함께 접근하면 숨은 공유 상태가 된다. 가능하면 호출자가 상태를 전달하도록 만들고, 정적 상태가 꼭 필요하다면 동시 접근 규칙을 명확히 해야 한다.

프로세스 환경은 `name=value` 형식의 문자열 배열이다.

```c
char *home = getenv("HOME");
char *path = getenv("PATH");
if (home == NULL) {
    /* 환경 변수가 없는 경우의 기본 동작 */
}
```

대표적인 환경 변수는 `HOME`, `PATH`, `PWD`, `SHELL`, `TERM`, `LANG`, `TMPDIR`이다. 환경은 사용자와 실행 위치에 따라 달라질 수 있으므로 값이 항상 존재한다고 가정하면 안 된다.

## Process Termination

프로세스는 `main`에서 반환하거나 `exit`, `_Exit`, `_exit`를 호출해 종료할 수 있다. 일반적으로 종료 상태 0은 성공을 의미하고 0이 아닌 값은 오류나 특정 결과를 나타낸다.

`exit`는 `atexit`로 등록한 함수를 역순으로 실행하고 표준 I/O 버퍼를 정리한다. `_Exit`와 `_exit`는 이러한 사용자 수준 정리 동작이 다르므로 사용 목적을 구분해야 한다. `abort`나 종료 시그널에 의한 종료는 비정상 종료이며 core dump가 생성될 수 있다.

## 정리

- Program은 실행 파일이고 Process는 그 실행 중인 인스턴스다.
- Thread는 독립적인 실행 상태를 가지면서 프로세스 자원을 공유한다.
- `errno`는 실패를 확인한 직후 해석한다.
- `strtok`의 정적 상태는 단일 스레드에서도 문제를 일으킬 수 있다.
- 환경 변수와 종료 상태는 실행 환경에 따라 달라질 수 있으므로 명시적으로 검사한다.

## 참고: POSIX environment variables

|variable| Meaning|
|-|-|
|COLUMNS| Preferred width in columns for terminal|
|HOME |User’s home directory|
|LANG |Locale when not specified by LC_ALL or LC_*
|LC_ALL |Overriding name of locale|
|LC_COLLATE |Name of locale for collating information|
|LC_CTYPE| Name of locale for character classification|
|LC_MESSAGES |Name of locale for negative or affirmative responses|
|LC_MONETARY| Name of locale for monetary editing|
|LC_NUMERIC |Name of locale for numeric editing|
|LC_TIME| Name of locale for date/time information|
|LINES |Preferred number of lines on a page or vertical screen|
|LOGNAME| Login name associated with a process|
|PATH |Path prefixes for finding executables|
|PWD| Absolute pathname of the current working directory|
|SHELL |Pathname of the user’s preferred command interpreter|
|TERM| Terminal type for output|
|TMPDIR| Pathname of directory for temporary files|
|TZ |Time zone information|