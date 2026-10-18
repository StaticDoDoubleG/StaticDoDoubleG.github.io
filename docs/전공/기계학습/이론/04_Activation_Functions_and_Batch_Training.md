# 활성화 함수와 학습 단위

## 1. 활성화 함수
Sigmoid $\sigma(x)=1/(1+e^{-x})$는 0과 1 사이를 출력하지만 포화 영역의 기울기가 작다. ReLU $\max(0,x)$는 양수 구간의 기울기가 1이라 학습이 빠르지만 음수로 고정된 뉴런은 Dying ReLU가 될 수 있다. Leaky ReLU $\max(ax,x)$는 음수 구간에 작은 기울기를 남긴다.

Softmax는
$$p_i=\frac{e^{z_i}}{\sum_j e^{z_j}}$$
로 여러 logits를 확률처럼 바꾸며 합이 1이다. 구현에서는 `z - max(z)`로 overflow를 막는다.

## 2. Iteration, batch, epoch
- **Batch size**: 한 번의 update에 쓰는 샘플 수.
- **Iteration/step**: 한 batch를 순전파·역전파하고 파라미터를 한 번 갱신하는 것.
- **Epoch**: 전체 train set을 한 번 사용한 것.

샘플 수가 $N$, batch size가 $B$이면 일반적으로 epoch당 update 수는 $\lceil N/B\rceil$이다. 예를 들어 $N=60,000$, $B=32$이면 1,875회다.

## 3. Validation의 이유
훈련 loss만 낮아지는 것은 암기일 수도 있다. validation data로 학습 중 모델·학습률·epoch 같은 선택을 비교하고, test data는 최종 일반화 평가에 남긴다. `model.train()`은 dropout/batch norm의 학습 모드, `model.eval()`은 평가 모드다.

## 4. 활성화 함수의 수치 범위

Sigmoid의 출력 범위는 $(0,1)$이므로 이진 분류의 확률 해석에는 편리하지만, hidden layer의 값이 큰 양수나 음수로 이동하면 gradient가 작아진다. ReLU는 양수 영역을 그대로 통과시키므로 gradient vanishing을 완화하지만 음수 영역을 영구적으로 통과하지 못할 수 있다. Leaky ReLU는 이 음수 영역에 작은 slope를 남긴다.

Softmax는 batch 전체가 아니라 샘플별 class 차원에 적용해야 한다. `(B, C)` logits에서 각 행의 합이 1이 되어야 하며, batch 차원까지 합쳐 정규화하면 서로 다른 이미지의 예측이 영향을 주게 된다.

## 5. batch size가 바꾸는 것

batch size를 늘리면 한 번의 gradient가 더 많은 샘플 평균을 반영해 흔들림이 줄어들지만, 한 epoch의 iteration 수는 줄어든다. batch size를 줄이면 update 빈도와 noise가 늘어난다. 따라서 `batch size=8`과 `batch size=32`의 결과를 비교할 때 epoch 수만 같게 두지 말고 총 update 수와 learning rate도 함께 기록한다.

## 6. validation과 mode 전환

학습 중에는 `model.train()`을 사용하고 batch 단위로 gradient를 계산한다. 검증에서는
```python
model.eval()
with torch.no_grad():
	logits = model(images)
```
를 사용한다. `eval()`은 Dropout을 끄고 BatchNorm을 저장된 통계 사용 모드로 바꾼다. `no_grad()`는 계산 그래프를 만들지 않아 메모리 사용을 줄인다. 둘은 서로 대체 관계가 아니다.
