# 활성화 함수와 MNIST 분류

## 1. 왜 활성화 함수가 필요한가
선형층을 여러 개만 쌓으면 결국 하나의 선형 변환으로 합쳐진다. 층 사이에 비선형 함수를 넣어야 MLP가 비선형 관계를 표현한다. 계단 함수는 미분이 어려워 역전파 학습에는 부적합하다.

| 함수 | 식 | 핵심 |
|---|---|---|
| Sigmoid | $1/(1+e^{-x})$ | 출력 $(0,1)$, 포화 구간에서 기울기 소실 |
| ReLU | $\max(0,x)$ | 빠르고 양수 구간 기울기 1, Dying ReLU 가능 |
| Leaky ReLU | $\max(ax,x)$ | 음수 구간에도 $a$ 기울기 유지 |
| Softmax | $e^{z_i}/\sum_j e^{z_j}$ | 다중 클래스 점수를 확률 분포로 변환 |

```python
def sigmoid(x): return 1 / (1 + np.exp(-x))
def relu(x): return np.maximum(0, x)
def leaky_relu(x, a=0.1): return np.maximum(a*x, x)
```
`np.maximum`은 원소별 최댓값이고 `np.max`는 배열 전체의 하나의 최댓값이므로 혼동하지 않는다.

## 2. Softmax 안정화
큰 logits에 바로 `exp`를 취하면 overflow가 난다. 모든 logit에서 같은 $c$를 빼도 결과가 같으므로 $c=\max(z)$를 사용한다.

```python
c = np.max(a)
exp_a = np.exp(a - c)
return exp_a / np.sum(exp_a)
```
이는 분자·분모의 공통 $e^{-c}$가 약분되기 때문이다.

## 3. MNIST MLP
MNIST는 28×28 흑백 이미지와 0~9 레이블이다. 입력 shape은 $(B,1,28,28)$이고 `Flatten` 뒤 $(B,784)$가 된다.

$$ (B,1,28,28)\to(B,784)\to(B,H)\to(B,10) $$

마지막 출력은 10개 logits이다. `CrossEntropyLoss`가 내부적으로 log-softmax를 처리하므로 모델 끝에 Softmax를 다시 붙이지 않는다. 레이블은 원-핫이 아닌 정수 class index를 사용한다.

```python
optimizer.zero_grad()
logits = model(images)
cost = criterion(logits, labels)
cost.backward()
optimizer.step()
```
평가에서는 `model.eval()`과 `torch.no_grad()`를 사용한다. 학습 자료의 권장 예는 512-128-32 은닉층, 30 epoch, batch size 32, learning rate 0.01이며 실행마다 성능은 달라질 수 있다.

## 4. 함수별 값과 gradient

### Sigmoid

$$\sigma(x)=\frac{1}{1+e^{-x}},\qquad \sigma'(x)=\sigma(x)(1-\sigma(x))$$

입력이 0이면 출력은 0.5이고, 큰 양수에서는 1에 가까워지며 큰 음수에서는 0에 가까워진다. 출력이 0 또는 1에 가까워질수록 미분값은 작아진다. 예를 들어 $\sigma(0)=0.5$일 때 미분값은 0.25지만, 출력이 0.99이면 $\sigma'(x)=0.0099$ 정도다. 여러 층에서 이런 값이 연속해서 곱해지면 앞쪽 층의 gradient가 거의 전달되지 않는다.

### ReLU와 Leaky ReLU

$$\mathrm{ReLU}(x)=\max(0,x)$$

양수 입력에서 미분값은 1이므로 sigmoid보다 gradient가 잘 전달된다. 반면 음수 입력은 출력과 gradient가 모두 0이다. 학습 중 특정 뉴런의 pre-activation이 계속 음수이면 그 뉴런은 업데이트를 거의 받지 못하고 죽은 상태가 된다.

$$\mathrm{LeakyReLU}(x)=\begin{cases}x&x>0\\ax&x\le0\end{cases}$$

`a=0.1`이면 음수 영역의 gradient가 0.1로 남는다. Dying ReLU를 완전히 제거하는 것은 아니지만 음수 영역에서 다시 양수 영역으로 돌아갈 가능성을 남긴다.

## 5. Softmax와 logits

Softmax는 한 샘플의 클래스 점수 전체를 함께 처리한다. 따라서 ReLU처럼 각 원소를 독립적으로 변환하는 함수가 아니다. $z=[2,1,0]$이면 $e^z$의 비율을 정규화해 가장 큰 점수에 가장 큰 확률을 배정한다. 모든 점수에 같은 상수 $c$를 더하거나 빼도 비율은 바뀌지 않는다.

$$\frac{e^{z_i-c}}{\sum_j e^{z_j-c}}=\frac{e^{-c}e^{z_i}}{e^{-c}\sum_j e^{z_j}}$$

실습의 `np.max(a)`는 이 불변성을 이용해 overflow를 막는다. Softmax 출력은 확률처럼 해석하기 위한 표현이고, 학습 손실에 raw logits를 직접 넣는 조합에서는 프레임워크의 안정화 구현을 사용한다.

## 6. 모델 용량과 하이퍼파라미터

은닉 뉴런 수가 8처럼 지나치게 작으면 784개의 픽셀 정보를 작은 표현으로 압축해야 하므로 복잡한 숫자 모양을 구분하기 어렵다. 반대로 은닉층과 뉴런을 무조건 늘리면 표현력은 증가하지만 계산량과 과적합 위험도 증가한다.

자료의 비교에서 `512-128-32`, batch size 32, learning rate 0.01, 30 epoch 조합이 작은 모델이나 sigmoid 조합보다 높은 성능을 보였다. 이 결과는 고정된 법칙이 아니다. 초기 가중치, 실행 장치, 데이터 순서에 따라 달라지므로 모델 구조·학습률·batch size·epoch를 함께 기록해야 재현이 가능하다.
