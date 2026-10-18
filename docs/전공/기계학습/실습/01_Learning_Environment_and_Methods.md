# 학습 환경과 머신러닝 학습 방법

## 1. 실습 환경
Colab 또는 로컬 Python 환경에서 NumPy와 PyTorch를 사용한다. notebook은 위 셀부터 순서대로 실행해야 하며, 앞 셀의 변수나 함수를 참조하는 셀을 수정했다면 그 지점부터 다시 실행한다. 셀을 임의의 순서로 실행하면 코드 자체는 맞아도 이전 실행에서 남은 변수 때문에 잘못된 결과가 나올 수 있다. 이 자료에서 환경 점검은 단순 설치 확인이 아니라 `import`, tensor 연산, device 사용이 실제로 가능한지 확인하는 첫 단계다.

실행 환경 기록에는 Python 버전, PyTorch 버전, CPU/GPU, CUDA 사용 가능 여부를 남기는 것이 좋다. MNIST처럼 반복 학습 시간이 긴 실습에서 CPU와 GPU 결과의 차이를 비교할 때 필요하다. GPU를 쓸 수 있는 MNIST 실습에서는 `device`로 모델과 tensor를 같은 장치에 둬야 한다.

```python
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = model.to(device)
images, labels = images.to(device), labels.to(device)
```

모델만 GPU에 두고 입력을 CPU에 남기거나 그 반대로 두면 device mismatch 오류가 난다. 반대로 추론 결과를 출력·NumPy로 변환할 때는 필요한 경우 `.cpu()`와 `.detach()`를 거친다.

## 2. 머신러닝의 세 가지 관점
- **지도학습**: 입력과 정답 쌍으로 규칙을 학습한다. 선형회귀처럼 숫자를 예측하는 회귀와, MNIST처럼 범주를 고르는 분류가 여기에 속한다.
- **비지도학습**: 정답 없이 데이터 내부의 구조를 찾는다. 따라서 학습 중 계산할 정답 기반 loss가 없고, 군집·차원 축소처럼 다른 목적과 평가 기준을 둔다.
- **강화학습**: 상태에서 행동을 선택하고 그 결과의 보상을 받아 정책을 개선한다. 한 샘플의 정답을 바로 맞히는 구조가 아니라 시간에 따른 행동의 결과를 다룬다.

머신러닝의 공통 과정은 문제 정의 → 데이터 수집·전처리 → train/validation/test 분할 → 모델 선택 → 손실 최소화 학습 → 검증·평가 → 새 데이터에 대한 추론이다. 앞 단계의 정의가 틀리면 뒤에서 optimizer를 바꿔도 해결되지 않는다. 예를 들어 연속적인 CPU 사용량을 예측하는 문제를 임의의 임계값으로 분류해 버리면 회귀가 분류로 바뀌고, loss와 metric 선택도 함께 바뀐다.

## 3. 왜 train과 test를 나누는가
훈련 데이터로 파라미터를 맞추면 모델은 본 데이터를 잘 맞출 수 있다. 이 성능은 모델이 규칙을 배웠다는 증거이면서 동시에 데이터를 암기했다는 결과일 수도 있다. 학습에 사용하지 않은 test 데이터가 있어야 **unseen data에서의 일반화 성능**을 측정하고 과적합을 발견할 수 있다.

세 집합의 역할은 분리한다.
- **train**: 가중치와 bias를 직접 갱신하는 데 사용한다.
- **validation**: learning rate, hidden size, epoch, dropout 같은 선택을 비교한다.
- **test**: 선택이 끝난 모델의 최종 일반화 성능을 한 번 평가한다.

validation을 보면서 계속 모델을 고르면 validation에도 간접적으로 맞춰질 수 있다. 그래서 test는 마지막까지 닫아 둔다. 데이터가 시간 순서나 사용자 단위로 묶여 있다면 단순 무작위 분할도 누수의 원인이 된다. 미래 시점의 값을 예측하는 문제에서 미래 샘플이 train에 섞이면 실제 운영 상황보다 성능이 높게 나온다.

예시:
```python
train_dataset = torchvision.datasets.MNIST(root='./data', train=True, ...)
test_dataset = torchvision.datasets.MNIST(root='./data', train=False, ...)
```

## 4. 전처리와 누수 기록
표준화나 정규화에 필요한 평균·표준편차도 train 데이터에서만 계산한다. 전체 데이터로 먼저 `fit`한 뒤 train/test를 나누면 test 분포의 정보가 train 전처리에 들어간다. 레이블을 만드는 데 미래 정보가 사용되는 시계열 문제도 같은 종류의 누수다.

```python
scaler.fit(X_train)
X_train = scaler.transform(X_train)
X_test = scaler.transform(X_test)
```

평가는 accuracy 하나로 끝내지 않는다. 클래스 불균형이 있으면 항상 다수 클래스만 예측해도 accuracy가 높을 수 있다. 분류에서는 precision, recall, F1, confusion matrix를 함께 기록하고, 회귀에서는 MAE·MSE·RMSE처럼 오차의 크기를 확인한다.

## 5. 자주 틀리는 지점
- test 데이터를 학습 또는 하이퍼파라미터 선택에 섞으면 평가가 낙관적으로 왜곡된다.
- notebook의 출력만 보고 모델을 판단하지 말고 문제에 맞는 지표와 baseline을 함께 기록한다.
- `model.train()`과 `model.eval()`을 구분하지 않으면 Dropout과 BatchNorm의 동작이 평가 결과에 영향을 준다.
- GPU 사용 시 `model.to(device)`, 입력 tensor, 정답 tensor의 device가 일치해야 한다.
- 새 셀을 실행하기 전에 이전 셀의 실행 상태를 믿지 말고, 필요하면 kernel을 재시작한 뒤 처음부터 재현한다.
