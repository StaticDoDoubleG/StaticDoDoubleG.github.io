# 초기화와 과적합 억제

## 1. 가중치 초기화
모든 가중치를 같은 값으로 시작하면 뉴런들이 같은 출력과 같은 gradient를 받아 대칭성이 깨지지 않는다. 무작위 초기화가 필요한 이유다. 초기값이 너무 크면 기울기 폭주, 너무 작으면 기울기 소실이 생길 수 있다.

- **Xavier**: Sigmoid/Tanh처럼 양방향 대칭적인 활성화에 적합. 분산을 대략 $2/(n_{in}+n_{out})$ 수준으로 둔다.
- **He**: ReLU/Leaky ReLU에 적합. 분산을 대략 $2/n_{in}$으로 둔다. PyTorch의 `nn.Linear`는 ReLU 기반 모델에 맞는 초기화를 사용한다.

질문 예시: ReLU를 사용할 때 어떤 초기화가 좋은가? → He.

## 2. 과적합 진단
과적합은 훈련 데이터에서는 성능이 높지만 새 데이터에서는 낮은 상태다. 큰 모델, 적은 데이터, 훈련 손실만 계속 낮아지는 패턴이 원인·신호다. validation 성능이 나빠지는 시점을 기록해 진단한다.

## 3. 억제 기법
### Weight Decay/L2
$$L_{total}=L_{data}+\lambda\sum_iw_i^2$$
큰 가중치에 벌점을 주어 복잡한 함수를 억제한다. L2 norm은 제곱합의 제곱근, L1 norm은 절댓값의 합이며, 수업의 weight decay는 주로 L2 항을 뜻한다.

### Dropout
학습 중 일부 뉴런의 출력을 무작위로 비활성화한다. 가중치를 삭제하는 것이 아니라 해당 forward에서 사용하지 않는 것이며, 특정 뉴런에 과도하게 의존하는 것을 줄인다. 예: `nn.Dropout(0.5)`.

### Batch Normalization과 앙상블
BatchNorm은 미니배치 중간값을 정규화해 학습 안정화와 속도 개선을 돕는다. 앙상블은 여러 모델의 예측을 결합하며, Dropout은 하나의 네트워크에서 서로 다른 부분 네트워크를 학습하는 효과를 낸다.

## 4. L1과 L2를 구분하는 기록

L1 norm은
$$\|w\|_1=\sum_i|w_i|$$
이고 L2 norm은
$$\|w\|_2=\sqrt{\sum_iw_i^2}$$
이다. 정규화 항으로 사용할 때는 L2 제곱합이나 L1 절댓값합을 loss에 더한다. L2는 큰 가중치를 전반적으로 줄이는 경향이 있고, L1은 일부 가중치를 정확히 0에 가깝게 만들어 sparse한 표현을 만들 수 있다.

## 5. 초기화의 분산

층을 통과할 때 값의 분산이 계속 커지거나 작아지면 activation과 gradient가 각각 폭주하거나 소실된다. Xavier는 입력·출력 노드 수를 함께 고려한다.
$$\mathrm{Var}(W)\approx\frac{2}{n_{in}+n_{out}}$$

ReLU는 음수 영역을 0으로 만들기 때문에 신호의 절반 정도가 제거되는 효과를 고려해 He 초기화가 사용된다.
$$\mathrm{Var}(W)\approx\frac{2}{n_{in}}$$

초기화는 optimizer를 대신하는 기법이 아니다. 같은 optimizer와 architecture라도 초기값이 나쁘면 학습 속도와 도달 성능이 달라진다.

## 6. Dropout의 train/eval 차이

Dropout은 학습 중 각 뉴런을 확률적으로 비활성화한다. `p=0.5`는 출력의 절반을 평균적으로 끈다는 뜻이지 가중치의 절반을 삭제한다는 뜻이 아니다. 평가 시에는 임의로 끄지 않고 프레임워크가 train/eval 모드에 따라 스케일을 맞춘다.

```python
model.train()  # dropout 활성화
model.eval()   # dropout 비활성화
```

평가 전에 `model.eval()`을 호출하지 않으면 같은 test input에도 결과가 달라질 수 있다. 과적합 억제 기법의 효과를 비교할 때 train loss뿐 아니라 validation loss와 validation accuracy의 간격을 함께 기록한다.

## 7. 과적합의 관찰 패턴

| 상태 | train loss | validation loss | 해석 |
|---|---:|---:|---|
| 학습 부족 | 높음 | 높음 | 모델 용량, epoch, learning rate 점검 |
| 정상 학습 | 감소 | 함께 감소 | 일반화가 개선되는 구간 |
| 과적합 시작 | 계속 감소 | 다시 증가 | early stopping 또는 정규화 검토 |
| 표현력 부족 | 크게 감소하지 않음 | 비슷하게 높음 | hidden size·특징·모델 구조 점검 |

Dropout이나 weight decay를 넣었는데 train 성능만 낮아지고 validation도 좋아지지 않는다면 underfitting일 수 있다. 기법을 적용하기 전후의 두 곡선을 같은 epoch 축에 놓고 비교한다.
