# 01. Shell과 UNIX 파일 시스템

시스템프로그래밍으로 처음 접하든, 아니면 다른 사유로 접하든<br>
우리는 살면서 리눅스와 친하게 지내야하는 일을 종종 겪는다.<br>
까만 화면에 흰 글씨, 뭔가 해커들의 일상인 것 같은 장면을<br>
보다 더 천천히, 답답하게 마주해야하는 현실에<br>
우리 가여운 인간들은 탄식을 한다.<br>
지금은 컴공인 나조차 원래는 그런 인간이었다.<br>
<p align="center">
  <img src="/uploads/images/1792296973745-977573401.jpg" width="300">
</p>

> 좆밥 비둘기의 일상

하지만 이제는 징징거릴 수 없는 중생이 되었기 때문에<br>
오늘도 눈물을 머금고 재수강 과목인 시스템프로그래밍의 내용을 정리하고자 한다.<br>
리눅스에 도가 텄을 [서버쟁이](https://nveloper.github.io)가 여기서 왜 이러고 있는지 묻는다면<br>
이게 다 공군 때문이라고 답할 것이다. ~[공군](https://www.mma.go.kr/board/boardList.do?gesipan_id=71&mc=usr0000129)은 [꿀](https://savethejunwon.duckdns.org)이긴 하다. 오 꿀이네요 꿀~<br>


## Shell이란?
로그인을 하면, Linux/Unix는 Shell이라 불리는 프로그램을 실행한다.<br>
여기서 Shell은 user와 OS 사이를 연결하는 명령어 해석기(Command Interpreter)라고 생각하면 좋다.<br>
Shell은 입력된 문자열을 해석하고, 실행할 프로그램을 찾고, 필요한 인자를 전달한 뒤 프로그램을 실행한다. <br>
<p align="center">
  <img src="/uploads/images/1792296617830-939735896.png" width="500">
</p>

```text
Shell 명령의 구조
prompt$ command option argument
```

## 경로와 현재 Directory

파일 시스템은 Directory 트리로 구성된다. Shell은 현재 Directory를 기준으로 상대 경로를 해석한다.

```bash
pwd                 # 현재 디렉터리의 절대 경로
cd /path/to/work    # 절대 경로로 이동
cd ..               # 부모 디렉터리로 이동
cd ~                # 홈 디렉터리로 이동
ls                 # 현재 디렉터리의 항목 확인
```

`~`는 사용자의 홈 디렉터리이고 `..`은 현재 디렉터리의 부모이다.<br>
명령을 실행하기 전에 `pwd`로 현재 위치를 확인하는 것이 좋다.<br>
같은 이름의 파일도 현재 디렉터리가 다르면 다른 파일을 가리킬 수 있기 때문이다.

### 경로를 확인하는 짧은 세션

```bash
$ mkdir -p practice/src
$ cd practice/src
$ pwd
/home/student/practice/src
$ cd ..
$ pwd
/home/student/practice
```

`cd`는 Shell 프로세스의 현재 디렉터리를 바꾸므로, 명령을 실행한 뒤 `pwd`의 결과가 달라진다. 반면 `mkdir`이나 `ls`는 현재 디렉터리를 바꾸지 않는다.

## 파일과 Directory 명령

```bash
mkdir project       # 디렉터리 생성
rmdir empty-dir     # 비어 있는 디렉터리 삭제
cat short.txt       # 짧은 파일 출력
less long.txt       # 탐색하며 파일 보기
head -n 50 log.txt  # 앞부분 보기
tail log.txt        # 뒷부분 보기
cp a.c backup.c     # 복사
mv old.c new.c      # 이동 또는 이름 변경
rm unwanted.c       # 파일 삭제
```

`less`에서는 `/문자열`로 검색하고 `q`로 종료한다.<br>
`rm -r`은 디렉터리와 그 내부를 재귀적으로 삭제하므로 실습 경로를 확인한 뒤 사용해야 한다. <br>
삭제된 파일은 일반적인 UNIX 명령만으로는 복구되지 않는다. ~꿈과 희망을 버려라~

## 목록과 와일드카드

```bash
ls -l      # 자세한 목록
ls -t      # 수정 시간 기준 정렬
ls -S      # 크기 기준 정렬
ls -h      # 사람이 읽기 쉬운 크기
ls -ltr    # 옵션 조합
```
옵션질의 향연이 시작되는 지점이다. ls는 list를 줄인 말인데,<br>
위 코드 블럭에 넣은 것이 전부냐 하면 그건 아닌 것이<br>
```
-a      # . 등으로 숨겨진 파일까지 모두 드러냄
-s      #파일이 차지하는 블록 크기(Size) 표시, S랑 헷갈리면 안됨
-R      # 하위 디렉토리의 내부 파일까지 **재귀**적으로 찾아 드러냄
-F      #파일형태(/(디렉토리), *(파일), @(심볼릭 링크)) 구분
-d      #디렉토리 자체의 정보만 표시
-i       #inode 번호를 함께 표시
-1      #한 줄에 하나씩만 출력
```
등이 더 있기 때문이다. 필요하다면 *man* 명령어로 더 확인할 수 있다.<br>

`*`는 여러 파일에 매칭되는 와일드카드다. 예를 들어 `*.c`는 현재 디렉터리의 C 소스 파일을 가리킨다. 와일드카드는 `rm`, `cp`에도 적용되므로 명령이 실제로 어떤 파일에 확장되는지 확인해야 한다.

```bash
$ ls *.c
main.c  copy.c  util.c
$ cp *.c backup/
```

두 번째 명령은 세 C 파일을 각각 `backup/`에 복사한다. 와일드카드가 아무 파일에도 매칭되지 않는 경우의 Shell의 동작은 설정에 따라 다를 수 있으므로, 삭제 명령 전에 `ls`로 먼저 확인한다.

## 표준 입출력과 파이프의 맛보기

Shell은 프로그램의 표준 입력과 표준 출력을 다른 파일 또는 프로그램에 연결한다.

```bash
program_a > result.txt
program_a < input.txt
program_a | program_b
grep pattern file.txt
```

`program_a | program_b`에서는 앞 프로그램의 표준 출력이 뒤 프로그램의 표준 입력이 된다. 이 기능은 나중에 나올 파일 디스크립터와 프로세스 통신에서 좀 더 자세하게 다룰 것이다.

```bash
$ grep -i error server.log | head -n 5
```

이 명령에서는 `grep`이 `server.log`에서 `error`가 들어간 줄을 출력하고, `head`가 그중 앞의 다섯 줄만 읽는다. 중간 결과를 임시 파일로 만들지 않고 두 프로세스의 표준 스트림을 연결한 예다.

~너무 힘들다 나~
