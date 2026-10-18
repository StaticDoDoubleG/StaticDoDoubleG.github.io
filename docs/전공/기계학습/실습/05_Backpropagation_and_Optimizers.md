# 역전파와 옵티마이저

## 1. 역전파
역전파는 손실에서 입력 방향으로 이동하며 각 파라미터의 기울기를 계산해 어느 방향으로 얼마나 갱신할지 결정한다. 핵심은 연쇄법칙이다.

$$z=t^2,\ t=x+y\Rightarrow\frac{\partial z}{\partial x}=\frac{\partial z}{\partial t}\frac{\partial t}{\partial x}=2t$$

계산 그래프를 작은 덧셈·곱셈 노드로 나누면 국소 미분을 곱해 전체 미분을 만들 수 있다. 덧셈 노드는 upstream gradient를 그대로 복사하고, 곱셈 노드는 반대편 입력을 곱한다.

사과 2개×200원, 오렌지 5개×300원, 세금 10%라면 총액은 $(200×2+300×5)×1.1=2090$원이다. 역전파는 가격·수량·세율이 총액에 미치는 변화율을 계산한다.

## 2. `zero_grad`의 이유
PyTorch의 `backward()`는 기존 gradient를 덮어쓰지 않고 누적한다. 따라서 매 배치마다 아래 순서를 지켜야 한다.
```python
optimizer.zero_grad()
cost.backward()
optimizer.step()
```
`zero_grad()`를 빼면 이전 배치의 기울기가 더해져 의도하지 않은 방향으로 갱신된다.

## 3. 옵티마이저 비교
- **SGD**: $\theta\leftarrow\theta-\eta\nabla J$. 단순하지만 미니배치 잡음과 진동이 있다.
- **Momentum**: 과거 이동 방향 $v$를 기억해 같은 방향은 가속하고 좌우 진동을 줄인다.
- **AdaGrad**: 파라미터별 제곱 기울기를 누적해 자주 변한 파라미터의 학습률을 줄인다. 누적량이 계속 커질 수 있다.
- **RMSProp**: 제곱 기울기의 지수 이동 평균을 사용해 오래된 영향은 잊는다. 보폭은 조절하지만 방향 관성은 별도로 기억하지 않는다.
- **Adam**: Momentum의 1차 모멘트와 RMSProp의 2차 모멘트를 결합하고 초기 편향을 보정한다. 일반적인 계수는 $\beta_1=0.9,\beta_2=0.999$이다.

시험에서는 이름 암기보다 `Momentum=방향 기억`, `RMSProp=보폭 조절`, `Adam=둘의 결합`으로 설명할 수 있어야 한다.

## 4. 계산 그래프를 읽는 방법

계산 그래프에서는 각 노드가 값을 계산하는 순전파 규칙과 gradient를 전달하는 역전파 규칙을 함께 가진다. 먼저 forward에서 중간값을 저장하고, backward에서 상류에서 내려온 gradient에 local derivative를 곱한다.

덧셈 노드 $z=x+y$는
$$\frac{\partial z}{\partial x}=1,\qquad\frac{\partial z}{\partial y}=1$$
이므로 upstream gradient를 두 입력에 그대로 전달한다. 곱셈 노드 $z=xy$는
$$\frac{\partial z}{\partial x}=y,\qquad\frac{\partial z}{\partial y}=x$$
이므로 forward 때의 반대 입력을 저장해 두었다가 gradient에 곱한다. 사과·오렌지 계산 그래프에서 가격과 수량의 영향도가 서로 반대쪽 값으로 곱해지는 이유가 이것이다.

## 5. 활성화 함수의 역전파

ReLU는 입력이 양수일 때 upstream gradient를 그대로 통과시키고, 음수일 때 0으로 만든다. 따라서 forward에서 어느 원소가 양수였는지 mask를 저장하는 구현이 필요하다. Sigmoid는 출력 $y$를 저장하면
$$\frac{dy}{dx}=y(1-y)$$
로 backward를 계산할 수 있다. 출력이 0이나 1에 가까우면 이 값이 작아져 앞층으로 전달되는 gradient도 작아진다.

## 6. Affine 층의 shape

행렬 형태의 affine 층을
$$Y=XA+B$$
라고 하자. $X$가 `(B, D_in)`, $A$가 `(D_in, D_out)`, $B$가 `(D_out,)`이면 $Y$는 `(B, D_out)`이다. loss의 gradient가 `dY`로 내려올 때 `dA`는 입력 `X`와 결합되고, `dX`는 가중치 `A`를 통해 앞층으로 전달된다. bias gradient는 batch 방향으로 합쳐진다.

## 7. SGD와 minibatch noise

전체 데이터 gradient와 미니배치 gradient는 일반적으로 다르다. 미니배치가 작을수록 update의 분산이 커져 경로가 흔들릴 수 있지만, 매 step의 계산량은 줄어든다. batch size를 바꾸면 update 횟수와 gradient noise가 동시에 바뀌므로 learning rate만 따로 비교하지 않는다.

## 8. 옵티마이저의 수식 차이

AdaGrad의 누적량은
$$h_t=h_{t-1}+g_t\odot g_t$$
이다. 과거 gradient가 계속 쌓여 denominator가 커진다. RMSProp은
$$h_t=\gamma h_{t-1}+(1-\gamma)g_t\odot g_t$$
로 바꾸어 오래된 gradient의 영향이 지수적으로 줄어들게 한다.

Adam은 gradient의 평균 $m_t$와 제곱 gradient의 평균 $v_t$를 모두 유지한다. 초기 상태가 0이므로
$$\hat m_t=\frac{m_t}{1-\beta_1^t},\qquad \hat v_t=\frac{v_t}{1-\beta_2^t}$$
로 편향을 보정한 뒤
$$\theta_t=\theta_{t-1}-\eta\frac{\hat m_t}{\sqrt{\hat v_t}+\epsilon}$$
로 업데이트한다.
