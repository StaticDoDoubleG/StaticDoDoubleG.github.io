# 퍼셉트론과 선형 모델

## 1. 퍼셉트론 계산
퍼셉트론은 $z=wx+b$ 또는 벡터 형태 $z=w^Tx+b$를 계산한 뒤 활성화로 출력한다. 계단 함수라면
$$y=\begin{cases}1&z>0\\0&z\le0\end{cases}$$
이다. 입력의 가중치가 클수록 해당 특징의 영향이 커지고 bias는 경계를 이동한다.

## 2. 선형 결정 경계
입력 2개에서 $w_1x_1+w_2x_2+b=0$은 직선이다. 따라서 단층 퍼셉트론은 선형 분리 가능한 AND, OR, NAND는 표현하지만 XOR는 표현하지 못한다. XOR를 해결하려면 여러 퍼셉트론을 층으로 조합해야 한다.

## 3. 선형회귀
선형회귀는
$$H(x)=Wx+b$$
로 연속값을 예측한다. 데이터와 직선의 차이는 MSE로 측정한다.
$$J(W,b)=\frac1n\sum_i(H(x_i)-y_i)^2$$

경사하강법은 손실이 감소하는 반대 방향으로 파라미터를 이동한다.
$$W\leftarrow W-\alpha\frac{\partial J}{\partial W},\qquad b\leftarrow b-\alpha\frac{\partial J}{\partial b}$$

## 4. PyTorch 구현 관점
`nn.Module`을 쓰면 모델의 파라미터 등록과 forward 계산을 클래스 안에 모을 수 있다. 단순한 선형회귀는 `nn.Linear(1, 1)`로 표현할 수 있고, optimizer는 `model.parameters()`를 받아 파라미터를 갱신한다. 학습 loop의 고정 순서는 `zero_grad → forward → loss → backward → step`이다.

## 5. 결정 경계와 표현력

퍼셉트론의 출력은 입력 공간을 하나의 반공간으로 자른다. $w$의 방향은 경계에 수직이고, $b$는 경계를 이동시킨다. 입력 특징의 단위나 크기가 달라지면 같은 $w$라도 경계의 의미가 달라질 수 있으므로 연속형 입력의 scale을 점검한다.

XOR는 선형 분리 불가능의 대표적인 예다. 다층 구조는 첫 층에서 `NAND`, `OR` 같은 중간 판정을 만들고, 두 번째 층에서 그 중간값을 조합한다. 층을 여러 개 쌓는다는 말의 핵심은 각 층의 비선형 출력이 다음 층의 새로운 입력 공간이 된다는 데 있다.

## 6. 회귀의 gradient 유도

단일 샘플의 $\hat y=wx+b$와 squared error $\ell=(\hat y-y)^2$에 대해
$$\frac{\partial \ell}{\partial w}=2(\hat y-y)x,\qquad\frac{\partial \ell}{\partial b}=2(\hat y-y)$$
이다. 오차가 양수이면 예측이 정답보다 크다는 뜻이므로, 양의 입력에서 $w$를 줄이는 방향이 loss를 낮춘다. 이 부호 관계를 코드의 `parameter -= learning_rate * gradient`와 연결해 둔다.

## 7. `nn.Module`을 사용하는 이유

```python
class LinearModel(nn.Module):
	def __init__(self):
		super().__init__()
		self.linear = nn.Linear(1, 1)

	def forward(self, x):
		return self.linear(x)
```

`nn.Linear`는 weight와 bias를 parameter로 등록한다. `model.parameters()`가 이를 반환하므로 optimizer를 만들 때 개별 tensor를 직접 나열하지 않아도 된다. `state_dict()`에 parameter가 저장되므로 학습 후 모델 상태를 재사용할 수 있다.
