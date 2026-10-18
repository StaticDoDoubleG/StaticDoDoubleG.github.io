# 오차 역전파

## 1. 핵심 개념
역전파는 손실의 gradient를 출력에서 입력 방향으로 전달해 각 가중치가 손실에 미친 영향을 계산하는 알고리즘이다. 새로운 규칙이 아니라 연쇄법칙을 계산 그래프에 적용한 것이다.

## 2. 국소 gradient
덧셈 $z=x+y$는
$$\frac{\partial z}{\partial x}=1,\quad\frac{\partial z}{\partial y}=1$$
이므로 상류 gradient를 그대로 복사한다. 곱셈 $z=xy$는
$$\frac{\partial z}{\partial x}=y,\quad\frac{\partial z}{\partial y}=x$$
이므로 반대 입력을 곱한다.

## 3. 계산 그래프 예시
사과 소계, 오렌지 소계, 합계, 세금 계산을 노드로 나누면 순전파는 값을 계산하고 역전파는 각 입력의 민감도를 계산한다. 복잡한 신경망도 affine, ReLU, loss 같은 노드의 local gradient를 연결하는 동일한 구조다.

## 4. 주요 층의 미분
ReLU는 양수에서 gradient 1, 음수에서 0이다. Sigmoid는
$$\sigma'(x)=\sigma(x)(1-\sigma(x))$$
이고 최대값이 0.25라 여러 층에서 작아지기 쉽다. affine 층 $Y=XW+b$는 입력·가중치·편향 각각에 gradient를 전달한다.

## 5. 코드로의 연결
```python
optimizer.zero_grad()  # 이전 batch gradient 누적 방지
loss.backward()        # 계산 그래프를 따라 gradient 계산
optimizer.step()       # gradient로 파라미터 갱신
```
시험에서는 계산을 길게 전개하기보다 역전파의 목적, 연쇄법칙, `zero_grad`의 역할을 자연어로 설명하는 것이 핵심이다.

## 6. 계산 그래프의 forward/backward 표

예를 들어 $z=xy$, $L=z^2$라면 forward는 `x,y → z → L` 순서다. backward는
$$\frac{\partial L}{\partial z}=2z$$
를 먼저 구하고,
$$\frac{\partial L}{\partial x}=\frac{\partial L}{\partial z}\frac{\partial z}{\partial x}=2z\cdot y$$
$$\frac{\partial L}{\partial y}=2z\cdot x$$
를 계산한다. 복잡한 신경망도 각 층을 local derivative의 조합으로 처리한다.

## 7. gradient가 누적되는 위치

PyTorch parameter에는 `param.grad`가 저장된다. `loss.backward()`를 두 번 실행하면 두 계산의 gradient가 합쳐진다. 의도적으로 gradient accumulation을 사용하는 경우가 아니라면 다음 batch 전에 `optimizer.zero_grad()`를 실행한다. `zero_grad`는 loss를 0으로 만드는 명령이 아니라 저장된 gradient를 초기화하는 명령이다.

## 8. vanishing과 exploding

연쇄법칙에서 local derivative가 1보다 작은 값으로 여러 번 곱해지면 vanishing gradient가 생기고, 큰 값이 반복되면 exploding gradient가 생긴다. sigmoid의 포화 구간, 과도하게 큰 초기값, 긴 층 깊이가 전자의 원인이 될 수 있다. ReLU, He 초기화, BatchNorm, 적절한 optimizer와 learning rate는 이 문제를 완화하는 도구다.
