# 09. UNIX I/O와 파일 디스크립터

앞선 게시물에서 파일 디스크립터 썰을 주구장창 푼 것 같은데 왜 또 등장하는지 의아할 것이다. 아까 다룰 때 설명하지 왜 이제와서 설명하는지도.<br>

왜냐하면 이 파일 디스크립터라는 건 I/O에 깊게 연관된 녀석이기 때문이다. <br>
유닉스 시스템은 **"모든 것을 파일로 다룬다(Everything is a file)"** 는 공통 입출력 모델을 사용하므로, 디스크에 있는 파일뿐만 아니라 키보드, 모니터, 네트워크 소켓 등도 모두 파일 디스크립터를 통해 동일한 인터페이스(`read`, `write`, `close` 등)로 조작한다. 그래서 I/O와 함께 설명한다.

## 장치 독립적인 UNIX I/O

UNIX는 디스크 파일뿐 아니라 터미널, 키보드, 프린터, 네트워크 인터페이스와 같은 장치도 파일이라는 추상화로 제공한다. 장치의 세부 동작은 드라이버가 담당하고 프로그램은 `open`, `close`, `read`, `write`, `ioctl` 같은 인터페이스를 사용한다.

입력 대상이 일반 파일인지 터미널인지 소켓인지에 따라 프로그램의 기본 읽기·쓰기 로직을 전부 바꾸지 않아도 된다는 것이 장치 독립적 I/O의 핵심이다.

## 파일 디스크립터와 표준 스트림

파일 디스크립터는 프로세스가 열린 파일이나 장치를 참조하는 음수가 아닌 정수다. <br>
엄밀히 말하면, 파일 디스크립터 테이블의 인덱스 번호라고 생각해도 좋다.<br>

셸에서 시작한 프로그램은 기본적으로 다음 디스크립터를 물려받는다.

- `STDIN_FILENO` 또는 0: 표준 입력
- `STDOUT_FILENO` 또는 1: 표준 출력
- `STDERR_FILENO` 또는 2: 표준 오류

```c
#include <unistd.h>
ssize_t count = read(STDIN_FILENO, buffer, sizeof buffer);
```

따라서 개발자(또는 니가) `open()`를 호출하면 3번부터 파일 디스크립터로 할당되게 되는 것이다.

파일 디스크립터가 인덱스라면 C 라이브러리에서 제공하는 파일 포인터라는 것도 있지 않았나? 라는 질문을 던질 모범생 분들이 있을 것이다. ~난 교수가 아니므로 이쁜 답을 못하겠지만~ fd와 fp의 차이는 저수준(OS)와 고수준(언어)의 차이다.<br>
잘 모르겠다면 fd는 **시스템 콜**에서 직접 사용되며, fp는 입출력 버퍼를 **user space**에 두고 있다는 걸 생각해보면 된다.<br> fp는 해당 버퍼에 fd를 보관하다 꽉 차거나 `fflush()`가 호출될 때 내부 fd를 통해 `write()` 시스템 콜을 날리는 관계라 생각하면 구조가 정립이 될 것이다.

## `read`와 부분 읽기

```c
ssize_t read(int fd, void *buf, size_t nbyte);
```

`read`는 `fd`가 가리키는 대상의 현재 파일 오프셋 위치에서 최대 `nbyte`(지정한) 바이트를 호출자가 제공한 버퍼로 읽는다.

- 양수: 실제 읽은 바이트 수
- 0: 일반 파일의 끝(EOF)
- `-1`: 실패, `errno` 설정

요청한 크기보다 적게 읽는 것은 오류가 아니다. 파일 끝, 터미널 입력, 파이프, 시그널에 의한 중단 때문에 부분 읽기가 발생할 수 있다. `buf`는 유효한 저장 공간이어야 하며 선언되지 않은 포인터를 넘기면 안 된다.

```c
char buffer[100];
ssize_t bytes = read(STDIN_FILENO, buffer, sizeof buffer);
if (bytes == -1) {
    perror("read");
}
```

## `write`와 부분 쓰기

```c
ssize_t write(int fd, const void *buf, size_t nbyte);
```

`write`는 버퍼의 데이터를 파일 디스크립터가 가리키는 대상으로 출력한다. 반환값은 실제로 기록한 바이트 수이므로, 큰 데이터를 보낼 때는 남은 바이트를 반복해서 처리해야 할 수 있다. `read`와 `write`는 문자열 함수가 아니며 `\0`을 자동으로 추가하지 않는다.
- 실제로 쓰인 바이트 수
- `-1`: 실패, `errno` 설정

## `EINTR`와 `readline`

입출력 시스템 콜이 진행 중 시그널을 받으면 `-1`을 반환하고 `errno`가 `EINTR`일 수 있다. 안전한 조건에서는 시스템 콜을 다시 시도할 수 있지만 이미 처리한 바이트를 중복하지 않도록 해야 한다.

`read`는 줄의 개념을 모르므로 줄 단위 함수는 개행, EOF, 오류, 버퍼 가득 참을 구분해야 한다. <br>
반면 `readline` 은 버퍼 마지막에 `\0`을 넣을 공간을 남기고, `EINTR`이면 다시 읽으며, 일부를 읽은 뒤 EOF가 온 경우도 구별한다.


## `open`과 생성 플래그

`open`은 파일이나 장치에 접근하겠다는 의도를 커널에 알리고 파일 디스크립터를 반환한다.

```c
#include <fcntl.h>

int fd = open("data.txt", O_RDONLY);
if (fd == -1) {
    perror("open");
}
```

새 파일을 만들 때는 생성·기존 내용 삭제·추가 기록 등의 동작을 플래그로 선택한다.

```c
int fd = open("data.txt", O_WRONLY | O_CREAT | O_TRUNC, 0666);
```
`open()`에서 쓰이는 플래그는 아래와 같다.<br>

권한 관련
- `O_RDONLY`: 읽기 전용 
- `O_WRONLY`: 쓰기 전용
- `O_RDWR`: 읽기/쓰기<br>

실행 관련
- `O_CREAT`: 파일이 없으면 생성
- `O_TRUNC`: 기존 파일 내용을 길이 0으로 자름
- `O_APPEND`: 매 쓰기를 파일 끝에서 수행
- `O_EXCL`: 생성 대상이 이미 있으면 실패

`O_CREAT`의 세 번째 인자는 요청 권한이고 실제 권한은 `umask`가 허용하지 않는 비트를 제거한 결과다. `O_TRUNC`는 기존 데이터를 즉시 잃게 만들 수 있으므로 주의한다.

## 파일 위치와 `lseek`
커널은 열린 파일마다 다음 읽기·쓰기 위치인 offset을 유지한(자동으로 증가시킨)다. 이것을 순차 접근(Sequential Access)이라 한다.<br>
하지만 우리는 특정 위치에서 데이터를 읽거나 쓰고 싶을 때도 있지 않는가?<br>
즉, 임의 접근(Random Access)이 필요하지 않은가?<br>
이럴 때 우린 `lseek`라는 것을 쓸 수 있다.

`lseek`는 열린 파일의 **File Offset, 다음 읽기/쓰기 위치)** 을 사용자가 원하는 위치로 직접 이동시킨다.

```c
off_t current = lseek(fd, 0, SEEK_CUR);
off_t start = lseek(fd, 0, SEEK_SET);
off_t later = lseek(fd, 10, SEEK_CUR);
```

`SEEK_SET`은 파일 시작, `SEEK_CUR`는 현재 위치, `SEEK_END`는 파일 끝을 기준으로 한다. 파이프, 터미널, 일부 장치는 순차 스트림이므로 `lseek`가 실패한다.


## `close`와 디스크립터 관리
`close`는 열려 있는 파일 디스크립터(FD)를 닫고 커널 자원을 해제한다.
```c
if (close(fd) == -1) {
    perror("close");
}
```
`close`는 프로세스의 FD 테이블 항목을 지우고 커널 시스템 파일 테이블의 참조 카운트를 1 감소시키는 식으로 작동한다.

열린 디스크립터를 누적하면 프로세스의 디스크립터 한도에 도달할 수 있다. 시그널 때문에 `close`가 `EINTR`로 반환될 수 있으므로 무조건 재시도하면 안 되며, 이미 닫힌 디스크립터 번호가 다른 파일에 재사용될 가능성도 고려해야 한다.

## 파일 디스크립터와 `stdio` 파일 포인터

저수준 UNIX I/O는 정수 파일 디스크립터를 사용하고, C 표준 입출력 라이브러리는 아까 파일 디스크립터 설명할 때 잠깐 말한 `FILE *` 파일 포인터를 사용한다.

- 파일 디스크립터: 커널의 열린 파일을 가리키는 정수 핸들
- 파일 포인터: `stdio`가 관리하는 구조체에 대한 포인터

다시 말하자면, 파일 포인터 구조체는 내부적으로 파일 디스크립터와 사용자 공간 버퍼, 스트림 상태를 포함한다. 따라서 파일 포인터가 단순히 파일 디스크립터의 다른 이름은 아닌 것이다.

```text
FILE * (stdio 파일 구조체, 사용자 공간 버퍼)
        |
        +-- file descriptor
                |
                v
        프로세스의 파일 디스크립터 테이블
                |
                v
        시스템 파일 테이블
                |
                v
        메모리 inode 테이블 -> 파일의 inode
```

프로세스의 파일 디스크립터 테이블에서 새 항목의 인덱스가 파일 디스크립터다. 시스템 파일 테이블은 열린 파일의 현재 위치와 접근 상태를 관리하고, inode 정보는 파일의 메타데이터와 저장 위치를 찾는 데 사용된다.

## `open`과 `fopen`의 차이

```c
int fd = open("data.txt", O_RDONLY); /* int 파일 디스크립터 */
FILE *fp = fopen("data.txt", "r");  /* FILE 포인터 */
```

`open`은 파일 디스크립터를 반환하므로 `read`, `write`, `lseek`, `close`를 사용한다. <br>
`fopen`은 사용자 공간 `FILE` 구조체를 만들고 `FILE *`를 반환하므로 `fread`, `fwrite`, `fgets`, `fprintf`, `fclose`를 사용한다. `fd`를 `fread`에 넘기거나 `fp`를 `read`에 넘길 수는 없다.

`stdio`는 사용자 공간 버퍼를 사용하므로 작은 입출력을 모아 시스템 콜 횟수를 줄일 수 있다. 출력 버퍼는 `fflush`로 비우고 사용이 끝난 스트림은 `fclose`로 닫는다. 같은 파일에 저수준 I/O와 `stdio`를 섞으면 두 계층의 파일 위치와 버퍼가 어긋날 수 있으므로 가능하면 한 계층만 사용한다.

## 상속, 리다이렉션과 `dup2`
<p align="center">
  <img src="/uploads/images/1792318089904-408454456.png" width="500">
</p>

### 상속
`fork`는 파일 디스크립터를 상속한다. 셸은 이 특성을 이용해 자식 프로세스의 표준 스트림을 파일이나 파이프에 연결한다.

```text
프로세스의 fd 1 (표준 출력) -> dup2(file_fd, STDOUT_FILENO)
                         -> 프로그램은 계속 fd 1에 write
                         -> 실제 목적지는 파일
```

파이프를 사용하는 경우 부모와 자식은 사용하지 않는 파이프 끝을 닫아야 읽는 쪽이 EOF를 받을 수 있다. `FILE *` 스트림을 `fork`한 뒤 두 프로세스가 같은 버퍼를 각각 flush하면 중복 출력이 생길 수 있으므로, `fork` 전 출력 버퍼를 비우거나 자식에서 곧바로 `exec`하는 흐름을 사용한다.

### 리다이렉션
리다이렉션은 표준 입력(`STDIN_FILENO`, 0), 표준 출력(`STDOUT_FILENO`, 1), 표준 에러(`STDERR_FILENO`, 2) 등의 파일 디스크립터 엔트리가 가리키는 대상을 화면/키보드가 아닌 **다른 파일이나 디바이스로 변경**하는 메커니즘이다.
### `dup2` 시스템 콜
`dup2`는 C 프로그램 내부에서 파일 디스크립터 테이블 엔트리를 직접 복사·조작하여 입출력 리다이렉션을 구현하는 함수이다.
```
#include <unistd.h>
int dup2(int fildes, int fildes2);
```

동작 순서는 다음과 같다.
1. `fildes2`(타겟 FD 번호)가 이미 열려 있다면 커널이 해당 엔트리를 먼저 닫는다.
2. `fildes`(소스 FD 번호) 엔트리의 포인터 값을 `fildes2` 엔트리로 **복사**한다.
3. 복사 성공 시 설정된 `fildes2` 번호를 반환한다.

#### `dup2` 실행에 따른 테이블 변화 단계
1. **파일 열기**: `int fd = open("my.file", O_WRONLY | O_CREAT | O_APPEND, 0600);` 호출 시 파일 디스크립터 테이블의 빈 엔트리(예: 3번)가 `my.file`의 커널 시스템 파일 테이블을 가리킨다.
2. **dup2(fd, STDOUT\_FILENO)** **실행**: `dup2(3, 1)` 호출 시 1번(`STDOUT_FILENO`) 엔트리가 가리키던 기존 표준 출력(모니터) 포인터가 닫히고, 3번 엔트리가 가리키는 `my.file` 포인터 값으로 **복사·교체**된다.
3. **원본 FD 정리**: `close(fd)`(즉 `close(3)`)를 호출해 3번 엔트리를 지워도, 1번 엔트리가 여전히 `my.file` 시스템 파일 테이블 엔트리를 가리키고 있어 파일 오픈 상태가 유효하게 유지된다.
4. **결과**: 이후 `printf()`나 `write(STDOUT_FILENO, ...)`를 호출하면 화면이 아닌 `my.file`로 모든 출력 내용이 기록된다.

## 참고: POSIX Symbolic Names
POSIX는 permission bits에 대응하는 mask를 위한 symbolic name을 정의하고 있다.
|name|permission bit|
|-|-|
|S_IRUSR| read permission bit for owner|
|S_IWUSR| write permission bit for owner|
S_IXUSR| execute permission bit for owner|
S_IRWXU |read, write, execute for owner|
S_IRGRP| read permission bit for group|
S_IWGRP| write permission bit for group|
S_IXGRP |execute permission bit for group|
S_IRWXG|read, write, execute for group|
S_IROTH |read permission bit for others|
S_IWOTH |write permission bit for others|
S_IXOTH |execute permission bit for others|
S_IRWXO |read, write, execute for others|
S_ISUID| set user ID on execution|
S_ISGID| set group ID on execution

상기 명칭들은 `sys/stat.h`에 지정되어 있다.