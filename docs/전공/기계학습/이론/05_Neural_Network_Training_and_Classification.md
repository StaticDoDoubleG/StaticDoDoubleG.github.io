# 신경망 학습과 분류

## 1. 순전파와 손실
순전파는 입력에서 출력까지 계산해 logits 또는 예측값을 만든다. 손실은 정답과 예측의 차이를 하나의 scalar로 만들고, 역전파의 출발점이 된다. 정확도는 평가 지표로 유용하지만 미분 불가능하므로 직접 학습 목적 함수로 쓰기 어렵다.

## 2. 출력층과 손실의 조합
- 회귀: 선형 출력 + MSE.
- 이진 분류: 1개 logit에 BCE 계열. PyTorch에서는 `BCEWithLogitsLoss`가 sigmoid와 BCE를 안정적으로 결합한다.
- 다중 분류: 클래스 수만큼 logits + `CrossEntropyLoss`.

`CrossEntropyLoss`에는 정수 class index와 raw logits를 전달한다. 모델 끝에 Softmax를 붙이면 중복 계산과 수치 문제가 생길 수 있다. `argmax(logits)`와 `argmax(softmax(logits))`의 위치는 같다.

## 3. Cross Entropy
원-핫 정답 $y$와 확률 $p$에 대해
$$CE=-\sum_k y_k\log p_k$$
이다. 정답 클래스의 확률이 낮을수록 손실이 급격히 커진다. 확률 0의 로그를 피하려면 구현형 loss에서 `delta=1e-7`을 log 입력에 더한다.

## 4. 학습 loop
```python
for images, labels in loader:
    optimizer.zero_grad()
    logits = model(images)
    loss = criterion(logits, labels)
    loss.backward()
    optimizer.step()
```
평가에서는 gradient를 끄고 전체 데이터 기준 accuracy를 계산한다.

## 5. logits와 확률의 구분

logit은 정규화되지 않은 class score다. Softmax를 적용하면 확률 벡터가 되지만 `argmax`의 위치는 변하지 않는다. 학습에서 `CrossEntropyLoss`를 사용할 때는 raw logits를 전달한다. 이미 Softmax를 통과한 값을 다시 넣으면 수치 안정성을 프레임워크에 맡길 수 없고, 함수가 기대하는 입력 의미도 달라진다.

## 6. 정확도와 loss의 역할 차이

정확도는 맞혔는지 틀렸는지만 보므로 미분 가능한 연속 학습 신호가 아니다. 예측 확률이 정답에 가까워지는 과정은 accuracy가 변하지 않아도 loss가 줄어드는 것으로 관찰할 수 있다. 학습 중에는 loss curve를 보고, 최종 평가는 accuracy·precision·recall·F1 등 문제에 맞는 metric을 함께 본다.

## 7. 이진 분류의 두 출력 표현

출력 뉴런 하나에 sigmoid를 적용해 확률을 만들고 BCE를 계산하는 방식이 있다. 다른 방식은 sigmoid 이전의 logit을 그대로 출력하고 `BCEWithLogitsLoss`를 사용하는 것이다. 후자는 sigmoid와 log를 합친 안정화 계산을 내부에서 수행하므로 직접 sigmoid를 중복 적용하지 않는다.

## 8. 정답 dtype과 shape

다중 분류의 `CrossEntropyLoss`는 일반적으로 logits `(B,C)`와 정수 target `(B,)`를 요구한다. target을 float one-hot `(B,C)`로 바꾸면 기대하는 API가 달라질 수 있다. 오류가 날 때는 마지막 층의 출력 크기, target의 dtype, target의 범위를 먼저 확인한다. MNIST target 범위는 0부터 9까지다.
